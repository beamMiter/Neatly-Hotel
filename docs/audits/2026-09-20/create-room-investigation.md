# Create Room & Property — ตรวจและแก้ปัญหาอัปโหลด

พบสาเหตุที่ reproduce ได้จากโค้ดปัจจุบัน: ฟอร์มกำหนดรูปหลัก 1 รูปและ gallery อย่างน้อย 4 รูป โดยแต่ละรูปใหญ่ได้ 5 MiB แต่ Next.js 16.3 proxy มี body buffer เริ่มต้น 10 MiB และ proxy ของโปรเจกต์ครอบคลุม `/api/room-types`

ทดสอบด้วย multipart form 5 รูป รูปละ 3 MiB ผ่าน `getCloneableBody()` ของ Next.js ที่ติดตั้งจริง:

| รายการ | ผลก่อนแก้ |
| --- | --- |
| ข้อมูลที่ส่ง | 15,729,365 bytes |
| ข้อมูลที่เหลือหลัง proxy | 10,485,760 bytes |
| `request.formData()` | `Failed to parse body as FormData.` |

API จับ parse error แล้วคืน 400 `Invalid request body` จึง Create ไม่ได้แม้แต่ละไฟล์ผ่าน validation ของฟอร์ม

สิ่งที่แก้:

- เพิ่ม `experimental.proxyClientMaxBodySize` เป็น 32 MiB
- จำกัดไฟล์รวมในหนึ่งฟอร์มไว้ 30 MiB เพื่อเหลือพื้นที่สำหรับ multipart และข้อความ
- ตรวจขนาดรวมทั้ง create/edit ที่ validation ร่วมฝั่ง browser และ server
- ให้หน้า edit เรียก parser ร่วมก่อนส่ง request ด้วย
- แสดงคำอธิบายขนาดไฟล์ในหน้า create
- เพิ่ม regression tests ที่ส่งรูป 5 รูป รูปละ 5 MiB ผ่านตัว buffer จริงของ Next.js และตรวจ boundary/oversized forms

ตรวจ Supabase ที่ตั้งค่าในเครื่องแบบอ่านอย่างเดียวแล้ว:

- อ่าน `room_types.id`, `promotion_price`, `amenities` ได้
- มี bucket `room-images`
- bucket จำกัดไฟล์ละ 5,242,880 bytes และรองรับ JPEG, PNG, WebP, AVIF ตรงกับ validation

ไม่ได้สร้างข้อมูลตัวอย่างบนฐานข้อมูลร่วม ไม่ได้อัปโหลดไฟล์จริง และยังไม่ได้รับชื่อหน้าหรือข้อความ error ของเหตุการณ์ที่ทีมพบ จึงยืนยันได้ว่านี่เป็นสาเหตุหนึ่งของ Create Room & Property ที่เสีย แต่ยังไม่ยืนยันว่าเป็นเหตุการณ์เดียวกับที่ทีมรายงาน

ต้อง restart Next.js dev server หรือ rebuild/redeploy เพื่อใช้ค่าจาก next.config.ts ใหม่ หาก hosting มีเพดาน request body ของตัวเองต่ำกว่า 32 MiB ต้องตรวจเพดานนั้นเพิ่มเติม; การตั้งค่า Next.js ไม่ได้เปลี่ยนข้อจำกัดของ hosting

ชุดตรวจเฉพาะ:

ผลหลังแก้: regression tests ผ่าน 4/4, TypeScript ผ่าน, ESLint เฉพาะไฟล์ที่แก้ผ่าน และ production build ผ่าน (54/54 static pages)

```powershell
npm.cmd exec -- vitest run tests/features/rooms/upload-body.test.ts --maxWorkers=2
npm.cmd run typecheck
```
