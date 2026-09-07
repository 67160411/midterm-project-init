# คำถามวิเคราะห์ 4 ข้อ ใน answers.md — SQL injection กับ allowlist, ความสำคัญของ transaction, in-memory cache กับ multi-instance deployment, การจัดการ API deprecation

## SQL Injection:

คือการที่ผู้โจมตีส่ง SQL ที่เป็นอันตรายเข้ามาผ่าน Input ของ API แล้วทำให้คำสั่ง SQL ทำงานผิดจากที่โปรแกรมตั้งใจ

ป้องกันด้วย Parameterized Query และ Allowlist เพื่อไม่ให้ Input ที่ไม่พึงประสงค์ถูกนำไปสร้าง SQL โดยตรง

## Transaction:

คือการทำงานของ Database หลายคำสั่งให้สำเร็จทั้งหมด หรือยกเลิกทั้งหมด

ใช้เมื่อหลายคำสั่ง Database ต้องสำเร็จร่วมกัน เพื่อรักษาความถูกต้องและความสอดคล้องของข้อมูล โดยใช้ Commit และ Rollback

## In-memory + Multi-instance:

คือการเก็บข้อมูลไว้ใน Memory ของ ตัว Server เอง

In-memory Cache อยู่เฉพาะในแต่ละ Instance เมื่อ Scale หลาย Instance ข้อมูล Cache จึงไม่แชร์กัน จึงเหมาะที่จะใช้ Redis เป็น Shared Cache

## API Deprecation:

Deprecation = API เวอร์ชันเก่ากำลังจะเลิกใช้ และต้องการให้ผู้ใช้ย้ายไปใช้เวอร์ชันใหม่

ไม่ควรลบ API เก่าทันที แต่ควรประกาศ Deprecated สร้างเวอร์ชันใหม่ ให้เวลา Client ย้ายระบบ แล้วจึงยุติการรองรับเวอร์ชันเก่า
