-- Reference seed for future Supabase deploy (cloud phase).
-- Local dev: run `npm run db:seed` (Prisma) instead.

insert into rooms (room_no, room_type, bed_type, status) values
  ('0001', 'Superior Garden View', 'Queen Bed', 'Occupied'),
  ('0002', 'Deluxe', 'King Bed', 'Assign Clean'),
  ('0003', 'Superior', 'Twin Beds', 'Vacant Clean'),
  ('0004', 'Premier Sea View', 'King Bed', 'Occupied Dirty'),
  ('0005', 'Supreme', 'Super King Bed', 'Vacant Clean Inspected'),
  ('0006', 'Suit', 'King Bed', 'Vacant Clean Pick Up'),
  ('0007', 'Superior', 'Double Bed', 'Occupied Clean'),
  ('0008', 'Superior', 'Single Bed', 'Assign Dirty'),
  ('0009', 'Deluxe', 'Twin Beds', 'Out of Service'),
  ('0010', 'Superior Garden View', 'Queen Bed', 'Vacant'),
  ('0011', 'Deluxe', 'King Bed', 'Occupied'),
  ('0012', 'Superior', 'Twin Beds', 'Assign Clean'),
  ('0013', 'Premier Sea View', 'Double Bed', 'Vacant Clean'),
  ('0014', 'Supreme', 'Super King Bed', 'Occupied Dirty'),
  ('0015', 'Suit', 'King Bed', 'Vacant Clean Inspected'),
  ('0016', 'Superior', 'Sofa Bed', 'Vacant Clean Pick Up'),
  ('0017', 'Deluxe', 'Queen Bed', 'Occupied Clean'),
  ('0018', 'Premier Sea View', 'King Bed', 'Assign Dirty')
on conflict (room_no) do nothing;
