const { pool } = require("../db");
const { redisClient } = require("../cache");

const { authMiddleware, requireRole } = require("../middlewares/auth");

const ALLOWED_SORT_FIELDS = ["course_name", "credit", "created_at"];

module.exports = function registerCourseRoutes(v1Router, v2Router) {
  // =========================
  // GET /api/v1/courses
  // Redis Cache + MySQL
  // =========================
  // ตัวอย่างการใช้ Redis Cache ร่วมกับ MySQL
  v1Router.get("/courses", async (req, res, next) => {
    const cacheKey = "courses:v1";

    try {
      // 1. ตรวจสอบ Cache ก่อน
      const cachedData = await redisClient.get(cacheKey);

      // Cache Hit
      if (cachedData) {
        return res.status(200).json({
          message: "สำเร็จ",
          source: "cache",
          data: JSON.parse(cachedData),
        });
      }

      // 2. Cache Miss → ดึงจาก MySQL
      const [rows] = await pool.query("SELECT * FROM courses ORDER BY id");

      // 3. เก็บข้อมูลลง Redis
      await redisClient.set(cacheKey, JSON.stringify(rows));

      // 4. ส่ง Response
      return res.status(200).json({
        message: "สำเร็จ",
        source: "database",
        data: rows,
      });
    } catch (err) {
      next(err);
    }
  });

  // =========================
  // POST /api/v1/courses
  // JWT + RBAC + Transaction
  // =========================
  // ตัวอย่างการใช้ JWT + RBAC + Transaction
  // เพิ่ม Course และ Prerequisites พร้อมกัน
  // ถ้าเพิ่ม Course สำเร็จ แต่เพิ่ม Prerequisites ไม่สำเร็จ → Rollback
  // ต้องมี Role "admin" เท่านั้น
  // ตัวอย่าง Request Body
  // {
  //   "course_name": "วิชาใหม่",
  //   "credit": 3,
  //   "prerequisites": [1, 2]
  // }
  v1Router.post(
    "/courses",
    authMiddleware,
    requireRole("admin"),
    async (req, res, next) => {
      const { course_name, credit, prerequisites = [] } = req.body;

      let connection;

      try {
        // ตรวจสอบข้อมูลเบื้องต้น
        if (!course_name || credit === undefined) {
          return res.status(400).json({
            message: "กรุณาระบุ course_name และ credit",
          });
        }

        // รับ Connection จาก Pool
        connection = await pool.getConnection();

        // เริ่ม Transaction
        await connection.beginTransaction();

        // เพิ่ม Course
        const [result] = await connection.query(
          "INSERT INTO courses (course_name, credit) VALUES (?, ?)",
          [course_name, credit],
        );

        const courseId = result.insertId;

        // เพิ่ม Prerequisites
        for (const prereqId of prerequisites) {
          await connection.query(
            `INSERT INTO course_prerequisites
             (course_id, prereq_course_id)
             VALUES (?, ?)`,
            [courseId, prereqId],
          );
        }

        // ทุกอย่างสำเร็จ → Commit
        await connection.commit();

        // ข้อมูล courses เปลี่ยน → ลบ Cache เก่า
        await redisClient.del("courses:v1");

        return res.status(201).json({
          message: "เพิ่มข้อมูลสำเร็จ",
          data: {
            id: courseId,
          },
        });
      } catch (err) {
        // ถ้า Transaction เริ่มแล้ว → ย้อนกลับ
        if (connection) {
          await connection.rollback();
        }

        next(err);
      } finally {
        // คืน Connection ให้ Pool
        if (connection) {
          connection.release();
        }
      }
    },
  );

  // =========================
  // GET /api/v2/courses
  // API Versioning
  // ตัวอย่าง Response รูปแบบใหม่
  // =========================
  // ตัวอย่างการใช้ API Versioning
  // GET /api/v1/courses → Response รูปแบบเก่า
  // GET /api/v2/courses → Response รูปแบบใหม่
  v2Router.get("/courses", async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT * FROM courses ORDER BY id");

      return res.status(200).json({
        message: "success",
        version: "v2",
        count: rows.length,
        data: rows,
      });
    } catch (err) {
      next(err);
    }
  });

  registerCourseRoutes.ALLOWED_SORT_FIELDS = ALLOWED_SORT_FIELDS;
};
