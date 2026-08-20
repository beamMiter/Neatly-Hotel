<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- React Compiler เปิดอยู่ (`next.config.ts`)
- Frontend + backend อยู่ repo เดียวกัน
- Database: Prisma + Supabase PostgreSQL (ใช้ฐานข้อมูลร่วมกันทั้งทีม)
- Path alias: `@/*` → `./src/*`

## Setup ฐานข้อมูล

1. copy `.env.example` → `.env.local` แล้วใส่ `DATABASE_URL`
2. รันครั้งแรก:
   ```bash
   npm install
   npm run db:setup
   ```

| Script | ทำอะไร |
|---|---|
| `npm run db:deploy` | apply migration ที่มีอยู่ขึ้น Supabase |
| `npm run db:seed` | seed ข้อมูลตัวอย่าง |
| `npm run db:setup` | deploy + seed |
| `npm run db:migrate` | สร้าง migration ใหม่ — **ห้ามรันโดยไม่ถามทีมก่อน** ดูหัวข้อ "Database schema" ด้านล่าง |

# โครงสร้างโปรเจกต์ — ของแต่ละอย่างอยู่ตรงไหน

โปรเจกต์นี้มีหลายคนทำงานคู่ขนานกัน ที่ผ่านมาต่างคนต่างสร้างที่อยู่ของตัวเองขึ้นมาเพราะไม่มีกติกาเขียนไว้ ผลคือเคยมี Supabase client 4 ตัว, ที่เก็บ query 3 แบบ, และ type ชื่อ `Room` ที่นิยามซ้ำ 5 จุด — ตอนนี้รวม Supabase client และ query layer หลักเสร็จแล้ว (ดูตารางท้ายไฟล์ว่าเหลืออะไรอีก) หัวข้อนี้คือกติกาที่ตกลงกันแล้วเพื่อไม่ให้ของซ้ำแบบนี้งอกใหม่

## กติกาว่าอะไรอยู่ตรงไหน

| ต้องการทำอะไร | ที่อยู่ที่ถูกต้อง |
|---|---|
| สร้าง DB client (Prisma / Supabase) | `src/server/db/` **เท่านั้น** ห้ามสร้างที่อื่น |
| อ่าน/เขียน DB ฝั่ง server | `src/server/queries/*.query.ts` **เท่านั้น** |
| helper ทั่วไปที่ไม่ผูก domain | `src/lib/` |
| UI ที่ใช้ข้าม feature | `src/components/{ui,shared,layout,icons}/` |
| UI ที่ใช้ feature เดียว | `src/features/<name>/components/` |
| zod schema + type ที่ infer จากมัน | `src/features/<name>/validations.ts` |
| routing | `src/app/` — page/layout/route.ts เป็น wrapper บาง ๆ |

**`src/features/<name>/` เก็บได้แค่ `components/` กับ `validations.ts`** — ห้ามมี `queries.ts` ของตัวเอง ให้ย้ายไป `src/server/queries/` แทน

**`src/app/` ห้ามมี business logic หรือ data fetching** — เป็น routing layer เท่านั้น ถ้าเจอ logic ในนั้นให้ย้ายออกไป `features/` หรือ `server/queries/`

**ไฟล์ใน `src/features/` ห้าม import จาก `src/app/`** — เป็นการข้าม layer ผิดทิศ ถ้าต้องใช้ของร่วมกัน ให้ย้ายของนั้นขึ้นไป `src/server/` หรือ `src/lib/`

## กติกาการวาง TypeScript type

**ค่าเริ่มต้นคือประกาศไว้ในไฟล์ที่ใช้ ไม่ต้อง export** — props ของ component, route params, รูป DB row ที่ใช้ไฟล์เดียว ให้อยู่ในไฟล์นั้นเลย ประมาณ 80% ของ type ในโปรเจกต์เป็นแบบนี้และถูกต้องแล้ว

**type จะขึ้นไปอยู่ `src/types/<domain>.ts` ก็ต่อเมื่อมันเป็น return type หรือ input type ของฟังก์ชันใน `src/server/queries/*.query.ts`**

เหตุผล: ไฟล์ query เป็น infrastructure ที่ใช้ร่วมกัน มันจึงห้าม import type จากใน `src/features/<name>/` (นั่นคือ layer กลับทิศ) type ที่ query layer ใช้จึงต้องอยู่ในที่กลาง

อย่ายกทุก type ไปกอง `src/types/` เพราะ "ดูเหมือนใช้ซ้ำได้" — type ที่หน้าตาคล้ายกันแต่คนละผู้ใช้งาน (เช่นห้องในมุม admin vs ในมุมลูกค้าที่ค้นหา) ควรแยกกันและ**ตั้งชื่อให้ต่างกัน** ไม่ใช่ `Room` เหมือนกันหมด

ตัวอย่างจริงที่ทำตามกติกานี้แล้ว — คำว่า "ห้อง" มีความหมายต่างกัน 3 อย่างในระบบ ตั้งชื่อแยกกันชัดเจนแทนที่จะใช้ `Room` ซ้ำ:

| ไฟล์ | ความหมาย | ใช้กับ |
|---|---|---|
| `src/types/rooms.ts` → `Room` | ห้องจริงเชิงกายภาพ (เลขห้อง, สถานะทำความสะอาด) | Room Management |
| `src/types/room-type.ts` → `RoomTypeSummary`/`RoomTypeDetail` | ประเภทห้องที่ขาย (ราคา, สิ่งอำนวยความสะดวก) | Room & Property (admin) |
| `src/types/room-search.ts` → `RoomSearchResult` | ผลค้นหาห้องว่างของลูกค้า | หน้า `/search`, `/rooms/[id]` |

## Prisma กับ RLS — จุดที่พลาดแล้วเงียบ

**Prisma ต่อ DB ด้วยสิทธิ์ที่ข้าม Row Level Security ทั้งหมด** ต่างจาก Supabase client ที่ผูกกับ role ของผู้ใช้และถูก RLS บังคับ

**ห้ามย้าย query ที่พึ่ง RLS ในการกรองข้อมูลของผู้ใช้ ไปใช้ Prisma** — มันจะคืนข้อมูลของทุกคนโดยไม่มี error ให้จับ และจะไม่เจอตอนเทสด้วยบัญชีเดียว

ตารางที่ RLS-critical (ผูกกับตัวตนผู้ใช้โดยตรง): **`profiles`, `staff_members`, `chatbot_admins`**

ใช้ Prisma ได้กับงานที่ตั้งใจให้เห็นข้อมูลทั้งหมด เช่น admin dashboard, report, seed

## Database schema — กำลังย้ายมาที่ Prisma

`prisma/schema.prisma` คือแหล่งความจริงที่กำลังจะเป็นตัวหลัก แต่**ตอนนี้ยังไม่ครบ** ระวังก่อนแก้อะไร:

- `profiles`, `staff_members`, `chatbot_admins`, `chatbot_faqs`, `chatbot_settings` — **ยังไม่มี model ใน Prisma** อยู่ใน `supabase/migrations/*.sql` เท่านั้น
- `RoomType` ใน Prisma **ขาดคอลัมน์** `promotion_price` และ `amenities` ที่มีอยู่จริงใน DB
- `Booking` / `BookingRoom` มีใน `schema.prisma` แต่ไม่มี migration ไหนสร้าง ยังไม่ยืนยันว่าตรงกับ DB จริง
- `src/server/db/{schema,seed}.sql` เป็นไฟล์เก่าที่ไม่ใช่แหล่งความจริง อย่าใช้อ้างอิง

**ห้ามรัน `npm run db:migrate` หรือ `npm run db:push` โดยไม่ถามทีมก่อน** — DB ปัจจุบันอยู่ในสภาพ drift (มีตารางที่ Prisma ไม่รู้จัก) Prisma อาจเสนอให้ reset database ทั้งก้อน ซึ่งถ้ากดยืนยันบน DB ที่ใช้ร่วมกันคือข้อมูลหายทั้งหมด

ใช้ `npm run db:generate` (อัปเดต client) และ `npm run db:deploy` (apply migration ที่มีอยู่) ได้ตามปกติ

## ของเก่าที่ยังค้างอยู่ — อย่าลอกรูปแบบนี้

การ restructure ยังทำไม่เสร็จ ไฟล์เหล่านี้ยังอยู่ในที่ผิดตามกติกาข้างบน **ถ้าเขียนโค้ดใหม่อย่าเลียนแบบ** และถ้าต้องแก้ไฟล์พวกนี้อยู่แล้ว ให้ถือโอกาสย้ายไปที่ถูกต้อง:

| ไฟล์ที่ยังผิดที่ | ควรย้ายไป |
|---|---|
| `src/app/lib/chatbot-faq.ts` | `src/server/queries/chatbot.query.ts` |
| `src/app/lib/hotel.ts` | แยกเป็น query กับ logic ของ chatbot (ย้ายเข้า `src/features/chatbot/`) |
| `src/app/components/chat-widget.tsx` | `src/features/chatbot/components/` |

ทำไปแล้ว (อย่าย้ายซ้ำ): Supabase client รวมเหลือ `src/server/db/{supabase-server,supabase-admin,supabase-browser}.ts` แล้ว (`src/app/lib/supabase/*` ถูกลบ) และ `features/rooms/queries.ts`/`features/booking/queries.ts` ย้ายไป `src/server/queries/{room-types,booking-search}.query.ts` แล้ว พร้อม type ที่เกี่ยวข้องย้ายไป `src/types/{room-type,room-search}.ts`

`src/lib/` ตอนนี้มี `useInterval.ts` ด้วย (ย้ายมาจาก `src/animations/` ตอน rebase — อีก branch หนึ่งสร้างโฟลเดอร์นี้คู่ขนานกันตอนย้าย `smoothScroll.ts` เหมือนกัน จึงรวมเข้าที่เดียวแทนที่จะปล่อยให้เป็น helper location ที่ 4) ถ้าเห็นโค้ดอ้างอิง `@/animations/*` ที่ไหนคือของเก่าที่ยังไม่ได้อัปเดต

## หมายเหตุ: local dev มี 2 ฐานข้อมูลที่ไม่ได้ sync กัน

`NEXT_PUBLIC_SUPABASE_URL` (Supabase client, local `supabase start`) กับ `DATABASE_URL` (Prisma) **ชี้ไปคนละฐานข้อมูลกันตอนรัน local** — local Supabase Postgres มีแค่ `profiles`/`staff_members` เท่านั้น ไม่มี `room_types`/`rooms`/`hotel_information` เพราะตารางกลุ่มนี้ถูก migrate ผ่าน Prisma ไปที่อื่น

ผลคือ `/search`, `/room-property` (ใช้ Supabase client) จะขึ้น "ไม่พบห้อง" ตอนรัน local ทั้งที่ `/room-management` (ใช้ Prisma) เห็นข้อมูลปกติ — **นี่ไม่ใช่บั๊ก** เป็นช่องว่างที่ Phase 5 (ย้าย schema ทั้งหมดมาที่ Prisma) จะแก้ให้ตรงกัน อย่าเสียเวลาไล่หาสาเหตุถ้าเจออาการนี้ตอน dev local
