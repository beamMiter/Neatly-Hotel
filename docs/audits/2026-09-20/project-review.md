# Neatly Hotel — ผลตรวจโค้ดปัจจุบัน

วันที่ตรวจ: 20 กันยายน 2026 ตามบริบทงาน

พบปัญหา 10 รายการที่ควรแก้ โดย 7 รายการเกี่ยวกับการชำระเงินและสถานะการจองมีลำดับความสำคัญสูง ส่วนอีก 3 รายการกระทบความถูกต้องของข้อมูลและผลค้นหา

ตรวจ working tree รวมงาน PromptPay ที่ยังไม่ commit โดยไม่ได้แก้ application code ไม่ได้รัน migration/seed หรือสร้างรายการชำระเงินจริง ผลนี้เป็นการตรวจโค้ดและทดสอบแบบออฟไลน์ ไม่ใช่หลักฐานว่าเหตุการณ์เหล่านี้เกิดขึ้นแล้วใน production

## ผลตรวจอัตโนมัติ

| การตรวจ | ผล |
| --- | --- |
| `npm.cmd run typecheck` | ผ่าน |
| `npm.cmd run build` | ผ่าน รวม prerender 54/54 |
| `npm.cmd run lint` | 0 errors, 6 warnings |
| `npm.cmd test` ก่อนเพิ่มชุด audit | 21 suites ผ่าน, 81 tests ผ่าน; 2 suites เริ่มไม่ได้เพราะขาด environment variables |
| `security:check-authorization` | ผ่าน |
| `check:booking-lifecycle` | ผ่าน |
| `security:check-admin-booking-edit` | ผ่าน |
| `check:chatbot-routing` | ผ่าน |
| ชุดทดสอบ audit เพิ่มเติม | 6 tests: baseline ผ่าน 1, พบพฤติกรรมผิด 5 |

สอง suites ที่เริ่มไม่ได้คือ `src/app/api/register/route.test.ts` และ `src/features/auth/actions.test.ts` ซึ่งใช้ Supabase จริง แต่ script `test` เรียก `vitest run` โดยไม่โหลด `.env.local` ส่วน script เฉพาะ `test:register` และ `test:login` โหลด env ให้ ปัญหานี้จึงยังไม่ใช่หลักฐานว่า login/register ติดต่อระบบจริงไม่ได้

ชุด offline scripts บางตัวจำลองกติกาขึ้นมาเอง ไม่ได้เรียก query/API จริงทั้งหมด ผลผ่านจึงไม่ยืนยันความถูกต้องของ transaction และการประสานสถานะกับ Stripe

## รายการที่พบ

### 1. [P1] ยืนยันการชำระเงินหลังหมดเวลาจองได้โดยไม่ตรวจห้องซ้ำ

ตำแหน่ง: `src/server/queries/bookings.query.ts:658` และ `:263`

การสร้าง booking ใหม่ปล่อยห้องของรายการที่ `expires_at` หมดแล้ว แต่ `updateBookingPaymentStatus()` ตรวจเพียง `pending_payment/pending` ก่อนเปลี่ยนเป็น `confirmed/paid` และล้าง `expiresAt` ไม่มีการ lock ห้องหรือตรวจรายการที่จองชนอีกครั้ง

เงื่อนไขเกิด: A สร้างรายการและยังไม่จ่าย → ครบ 30 นาที → B จองห้องเดิมช่วงเดียวกัน → A จ่ายสำเร็จหรือ webhook ของ A มาถึงภายหลัง ทั้งสองรายการสามารถเป็น confirmed ได้ตามโค้ดปัจจุบัน

หลักฐาน: ตรวจเส้นทาง create → availability → webhook/confirmation และไม่พบ constraint ป้องกันช่วงวันทับซ้อนใน migrations ที่เก็บใน repo ยังไม่ได้ทดสอบ concurrency กับ DB จริง

แนวทางแก้: ใช้ transaction lock ห้องและตรวจ availability ก่อนยืนยันรายการหมดอายุ พร้อมเส้นทางคืนเงิน/ประสานยอดเมื่อรับเงินมาแล้วแต่ไม่สามารถจัดห้องให้ได้

### 2. [P1] ยกเลิก booking แล้ว PaymentIntent เดิมยังจ่ายได้

ตำแหน่ง: `src/server/queries/bookings.query.ts:963`, `:1005`, `:1015`

`cancelBooking()` เปลี่ยนสถานะ booking แต่ไม่มีการยกเลิก PaymentIntent ที่ยังรอจ่าย และจะอ่าน payments เฉพาะเมื่อ booking มีสถานะเงินเป็น paid เท่านั้น

เงื่อนไขเกิด: เปิดหน้าบัตร/QR ทิ้งไว้ → ยกเลิกรายการจากอีกแท็บ → กลับมาจ่ายในหน้าเดิม โค้ดยังไม่ได้ปิด PaymentIntent นั้น และ webhook success ไม่ยืนยัน booking ที่ cancelled แล้ว ทำให้เกิดยอดชำระโดยไม่มีห้องที่ยืนยันหรือการคืนเงินอัตโนมัติ

หลักฐาน: เรียก `cancelBooking()` จริงโดย mock DB/Stripe; spy ของ `cancelPaymentIntent` ถูกเรียก 0 ครั้ง

แนวทางแก้: ประสาน cancellation กับสถานะ Stripe ปิด intent ที่ยังจ่ายได้ และจัดการรายการที่ processing/succeeded ระหว่างยกเลิกอย่างชัดเจน

### 3. [P1] เงินที่จ่ายแล้วไม่ถูกคืนเมื่อยังมียอดเพิ่มรอจ่าย

ตำแหน่ง: `src/server/queries/bookings.query.ts:963` และ `src/server/queries/admin-booking-edit.query.ts:237`

สิทธิ์คืนเงินกำหนดว่าต้อง `paymentStatus === "paid"` แต่เมื่อ admin เพิ่มค่าห้องหรือบริการ สถานะอาจเปลี่ยนเป็น pending หรือ pay_at_hotel ทั้งที่มีเงินเดิมที่รับไว้แล้ว

เงื่อนไขเกิด: จ่าย 1,000 บาท → admin เพิ่มยอดเป็น 1,500 บาท → ยังไม่จ่ายส่วนเพิ่ม 500 บาท → ยกเลิกภายในช่วงคืนเงิน ระบบไม่ตรวจรายการ succeeded เดิมและไม่คืน 1,000 บาท

หลักฐาน: ชุด audit เรียก cancellation ของ booking ที่ confirmed/pending พร้อมข้อมูล payment เดิม; refund ถูกเรียก 0 ครั้ง ส่วน baseline confirmed/paid คืนเงินได้

แนวทางแก้: ใช้รายการ captured payments เป็นฐานคำนวณเงินที่คืนได้ แยกจากสถานะยอดคงค้างของ booking

### 4. [P1] อ่านประวัติการจ่ายเงินไม่ได้แล้วถือว่าลูกค้ายังไม่จ่ายทั้งหมด

ตำแหน่ง: `src/server/queries/bookings.query.ts:487` และ `src/app/api/bookings/[id]/payment-intent/route.ts:63`

เมื่ออ่าน payments ล้มเหลว `getBookingPaymentBalance()` คืน `paidAmount: 0` และ `amountDue: totalAmount` ผลนี้ถูกใช้สร้าง PaymentIntent สำหรับยอดเพิ่ม

เงื่อนไขเกิด: booking 1,500 บาทที่จ่ายแล้ว 1,000 บาทกำลังรอส่วนเพิ่ม → การอ่าน payments ครั้งแรก error ชั่วคราว → การเรียกถัดไปสำเร็จ ระบบสามารถสร้างยอดเรียกเก็บ 1,500 บาทแทน 500 บาท

หลักฐาน: mock read error แล้วเรียก query จริง ได้ `{ totalAmount: 1500, paidAmount: 0, amountDue: 1500 }` แทน error

แนวทางแก้: ให้การอ่านยอดล้มเหลวเป็น error และห้ามสร้าง payment จนกว่าจะยืนยันยอดเดิมได้

### 5. [P1] Booking ที่ยกเลิกแล้วถูกมองว่าเป็นรายการเก็บเงินเพิ่มได้

ตำแหน่ง: `src/server/queries/bookings.query.ts:513`, `src/app/api/admin/bookings/[id]/payment-intent/route.ts:29`, `src/features/booking/components/BookingPaymentView.tsx:41`

เงื่อนไข top-up ใช้ `status !== "pending_payment"` จึงรวม cancelled และ completed ด้วย การยกเลิกรายการที่ยังไม่จ่ายในข้อ 2 ทิ้งสถานะ cancelled/pending ซึ่งผ่านเงื่อนไขนี้พอดี

ผลกระทบ: เมื่อกลับเข้า payment URL ระบบสร้าง top-up ใหม่ได้โดยไม่ผ่าน `extendBookingHold()` และไม่จองห้องกลับ เมื่อจ่ายสำเร็จ `applyTopUpPaymentOutcome()` เปลี่ยนแค่ payment_status ทำให้ booking ยังคง cancelled

หลักฐาน: `isTopUpPaymentEligible({ status: "cancelled", paymentStatus: "pending" }, { amountDue: 1500 })` คืน true

แนวทางแก้: ระบุ allowlist สถานะที่เก็บเงินเพิ่มได้ และตรวจสถานะกับยอดอีกครั้งใน transaction ก่อนสร้าง payment

### 6. [P1] ลองจ่ายบัตรซ้ำในฟอร์มเดิมสำเร็จ แต่ booking ยังเป็น failed/cancelled

ตำแหน่ง: `src/features/booking/components/BookingPaymentView.tsx:272`, `src/features/booking/components/BookingFailedView.tsx:168`, `src/server/queries/bookings.query.ts:658`

ฟอร์มจ่ายเงินและฟอร์ม retry แสดง error แล้วเปิดให้กดซ้ำโดยใช้ `clientSecret` เดิม เมื่อ webhook ของการจ่ายครั้งแรกที่ล้มเหลวมาถึง booking จะถูกเปลี่ยนเป็น cancelled/failed การ success ของ intent เดิมในครั้งต่อมาจึงไม่ผ่าน guard ที่รับเฉพาะ pending_payment/pending

ผลกระทบ: Stripe รับเงินสำเร็จ แต่ booking ไม่กลับเป็นรายการที่ยืนยันแล้วและไม่มีเส้นทางคืนเงินรองรับใน handler นี้

หลักฐาน: ทดสอบเรียก query จริงเป็นลำดับ failed → paid ด้วย mock updateMany ที่ตรวจสถานะตาม where จริง สถานะสุดท้ายยังเป็น failed; ตรวจ UI พบว่ากดซ้ำใช้ secret เดิม

แนวทางแก้: เมื่อ fail ให้เริ่ม attempt ใหม่ผ่าน API ที่ตรวจห้องและคืนสถานะ pending อย่างถูกต้อง พร้อมจัดการ success ที่มาช้าของ attempt เดิม

### 7. [P1] เปลี่ยนเป็นจ่ายที่โรงแรมอาจถูก webhook ยกเลิก booking กลางทาง

ตำแหน่ง: `src/app/api/bookings/[id]/pay-at-hotel/route.ts:55`, `src/app/api/payments/webhook/route.ts` ใน case `payment_intent.canceled`, `src/server/queries/bookings.query.ts:787`

API ยกเลิก Stripe intent ก่อนเรียก `markBookingCashConfirmed()` ถ้า canceled webhook มาถึงในช่วงระหว่างสองขั้นตอน มันยังเห็น intent นั้นเป็นรายการล่าสุดและเรียก `updateBookingPaymentStatus(..., "failed")` จน booking กลายเป็น cancelled/failed จากนั้น cash confirmation จะคืน false และ API ตอบ 409

หลักฐาน: วิเคราะห์ลำดับการทำงานข้าม request; ยังไม่ได้ส่ง webhook จริงเพื่อวัด race นี้

แนวทางแก้: ทำให้ handler แยก intentional payment-method conversion ออกจาก payment failure ได้ และมีสถานะ/การประสานงานที่ป้องกัน webhook เปลี่ยน booking ระหว่าง conversion

### 8. [P2] สมัครสมาชิกแล้ววันเกิดย้อนหลังหนึ่งวันในเขตเวลาไทย

ตำแหน่ง: `src/features/auth/components/RegisterForm.tsx:94`, `src/components/ui/DateOfBirthField.tsx:116`, `src/app/api/register/route.ts:86`

ปฏิทินสร้าง Date ที่เที่ยงคืนของเครื่องลูกค้า ฟอร์มส่ง `toISOString()` และ API ตัด 10 ตัวแรกจาก UTC เพื่อบันทึกวันเกิด

หลักฐาน: ใน Asia/Bangkok เลือก 1990-01-15 → ส่ง `1990-01-14T17:00:00.000Z` → บันทึก `1990-01-14` ทดสอบ conversion นี้ด้วย Node แล้ว

แนวทางแก้: ส่งวันเกิดเป็น date-only `yyyy-MM-dd` ตลอดเส้นทางเหมือน BookingWizard ที่แก้ไว้แล้ว ไม่แปลงวันที่ปฏิทินผ่าน timestamp UTC

### 9. [P2] หน้า admin แสดง PromptPay เป็น Credit Card

ตำแหน่ง: `src/server/queries/customer-bookings.query.ts:167`, `src/features/customer-booking/components/BookingPaymentBreakdown.tsx:22`

`asPaymentMethod()` คืน cash เฉพาะค่า cash ส่วนค่าอื่นรวม promptpay ถูกแปลงเป็น credit_card ทำให้รายละเอียดการจองฝั่ง admin แสดงช่องทางรับเงินผิด แม้ booking ฝั่งลูกค้ารองรับ PromptPay แล้ว

หลักฐาน: ตรวจ mapping ตั้งแต่ข้อมูล booking จนถึงข้อความใน UI

แนวทางแก้: เพิ่ม promptpay ใน type ของรายละเอียด admin และ mapping/rendering ที่เกี่ยวข้อง

### 10. [P2] ผลค้นหาอาจแสดงห้องที่ถูกจองแล้วเมื่ออ่านรายการจองไม่ครบหรือ error

ตำแหน่ง: `src/server/queries/booking-search.query.ts:111`, `:128`; `supabase/config.toml:18`

`getBookedRoomIds()` อ่าน bookings ทั้งตารางโดยไม่มี filter ช่วงวันที่หรือ pagination แล้วค่อยกรองใน JavaScript ค่า Data API ใน local จำกัด 1,000 rows จึงอาจไม่เห็น booking ที่ต้องนำมาหักห้องว่างเมื่อข้อมูลเกินเพดาน นอกจากนี้ทั้ง error จาก bookings และ booking_rooms ถูกแปลงเป็น empty Set ซึ่งหมายถึงไม่มีห้องถูกจอง

ผลกระทบ: ลูกค้าเห็นห้องว่างและกรอกข้อมูลจนถึงขั้นจอง แต่ API สร้าง booking ที่ตรวจผ่าน Prisma ปฏิเสธด้วย conflict ภายหลัง ประเด็นนี้จึงเป็นผลค้นหาผิด ไม่ใช่การยืนยันว่าขั้น create ข้าม lock ได้

หลักฐาน: ตรวจ query และ limit ใน config; limit ของ Supabase production ยังไม่ได้ตรวจ

แนวทางแก้: กรองช่วงวันที่/สถานะใน DB และอ่านข้อมูลที่จำเป็นให้ครบ; เมื่อ query error ให้แสดงความล้มเหลวแทนการสรุปว่าห้องว่าง

## ข้อจำกัดและประเด็นที่ไม่จัดเป็นบั๊กใหม่

- Analytics อ่าน mock dataset ตามเจตนาที่เขียนไว้ใน `src/server/queries/analytics.query.ts:31` ตัวเลขจึงไม่สะท้อนการจองจริง ปัจจุบัน API analytics ไม่เรียก requireStaff แต่ข้อมูลที่คืนยังเป็น mock ไม่ได้ยืนยันว่าเปิดเผยยอดจริง ควรเพิ่ม authorization ก่อนเชื่อมข้อมูลจริง
- ความต่างของฐานข้อมูล local ระหว่าง Prisma และ Supabase เป็นข้อจำกัดที่ระบุไว้ใน AGENTS.md ไม่ใช้เป็นข้อสรุปว่าห้องหายเป็นบั๊กใหม่
- พบ migration `202609120001_lock_down_room_writes.sql` ที่ถอนสิทธิ์เขียนห้องแบบสาธารณะแล้ว จึงไม่นับ permissive policies เก่าใน 0002 เป็นช่องโหว่ปัจจุบันของ repo; ยังไม่ได้ยืนยัน migration ที่ apply จริงบน production
- ไม่ได้ทำ browser E2E, จ่ายเงินจริง, ทดสอบ SMTP จริง หรืออ่าน schema/RLS จริงของฐานข้อมูลที่ทีมใช้ร่วมกัน
- Lint warnings ที่พบ: unused variable ใน About และ customer-bookings query; dependency ของ useEffect ใน RoomDetail; img ใน AuthPageShell; unused eslint-disable ใน SearchPageView และ coverage output

## หลักฐานสำหรับทดสอบซ้ำ

เก็บ source ของชุดทดสอบไว้ที่ `payment-regressions.test.ts.txt` ในโฟลเดอร์เดียวกับรายงาน ใช้นามสกุล txt เพื่อไม่เพิ่ม failing tests เข้า default test run ของทีม

เมื่อต้องการ reproduce ให้ copy ไป `tests/server/audit-regressions.test.ts` แล้วรันจาก root:

```powershell
npm.cmd exec -- vitest run tests/server/audit-regressions.test.ts --maxWorkers=2
```

ผลที่ได้ตอนตรวจ: 6 tests, baseline ผ่าน 1 และ failed 5 สำหรับข้อ 2–6 ชุดทดสอบเรียก production query functions โดย mock DB/Stripe จึงตรวจการตัดสินใจและ transition ของโค้ดได้ แต่ไม่ได้ทดสอบ network หรือ transaction isolation จริง

ควรแก้ข้อ 1–7 ก่อน เพราะเกี่ยวกับการจัดห้องและการรับ/คืนเงิน จากนั้นแก้ข้อมูลวันเกิด ช่องทางชำระเงินใน admin และความถูกต้องของผลค้นหา
