-- Neatly Hotel: replace all physical rooms with layout data (70 rooms)
-- Run once in Supabase SQL Editor. Safe to re-run (deletes then re-inserts).
--
-- Main Tower: floors 2-12 (201-1206)
-- Pool Villa Wing: V101-V104
--
-- WARNING: Clears booking_rooms links and all existing rooms first.

begin;

delete from public.booking_rooms;
delete from public.rooms;

insert into public.rooms (room_no, room_type, bed_type, status, room_type_id)
select
  v.room_no,
  v.room_type,
  v.bed_type,
  v.status,
  rt.id
from (values
  ('201', 'Standard Room', 'Double Bed', 'Vacant Clean'),
  ('202', 'Standard Room', 'Double Bed', 'Occupied'),
  ('203', 'Standard Room', 'Double Bed', 'Assign Clean'),
  ('204', 'Superior', 'Double Bed', 'Vacant Clean Inspected'),
  ('205', 'Superior', 'Double Bed', 'Occupied Dirty'),
  ('206', 'Superior Room', 'Double Bed', 'Vacant'),
  ('301', 'Standard Room', 'Double Bed', 'Occupied Clean'),
  ('302', 'Standard Room', 'Double Bed', 'Assign Dirty'),
  ('303', 'Superior', 'Double Bed', 'Vacant Clean Pick Up'),
  ('304', 'Superior', 'Double Bed', 'Out of Service'),
  ('305', 'Superior Room', 'Double Bed', 'Vacant Clean'),
  ('306', 'Superior Room', 'Double Bed', 'Occupied'),
  ('401', 'Superior Room', 'Double Bed', 'Assign Clean'),
  ('402', 'Superior Room', 'Double Bed', 'Vacant Clean Inspected'),
  ('403', 'Garden View Room', 'Double Bed', 'Occupied Dirty'),
  ('404', 'Garden View Room', 'Double Bed', 'Vacant'),
  ('405', 'Superior Garden View', 'Double Bed', 'Occupied Clean'),
  ('406', 'Superior Garden View', 'Double Bed', 'Assign Dirty'),
  ('501', 'Garden View Room', 'Double Bed', 'Vacant Clean Pick Up'),
  ('502', 'Garden View Room', 'Double Bed', 'Out of Service'),
  ('503', 'Garden View Room', 'Double Bed', 'Vacant Clean'),
  ('504', 'Superior Garden View', 'Double Bed', 'Occupied'),
  ('505', 'Superior Garden View', 'Double Bed', 'Assign Clean'),
  ('506', 'Superior Garden View', 'Double Bed', 'Vacant Clean Inspected'),
  ('601', 'Superior Garden View', 'Double Bed', 'Occupied Dirty'),
  ('602', 'Superior Garden View', 'Double Bed', 'Vacant'),
  ('603', 'Superior Garden View', 'Double Bed', 'Occupied Clean'),
  ('604', 'Garden View Room', 'Double Bed', 'Assign Dirty'),
  ('605', 'Deluxe', 'King Bed', 'Vacant Clean Pick Up'),
  ('606', 'Deluxe', 'King Bed', 'Out of Service'),
  ('701', 'Deluxe', 'King Bed', 'Vacant Clean'),
  ('702', 'Deluxe', 'King Bed', 'Occupied'),
  ('703', 'Deluxe Room', 'King Bed', 'Assign Clean'),
  ('704', 'Deluxe Room', 'King Bed', 'Vacant Clean Inspected'),
  ('705', 'Deluxe Twin Room', 'Twin Beds', 'Occupied Dirty'),
  ('706', 'Deluxe Twin Room', 'Twin Beds', 'Vacant'),
  ('801', 'Deluxe Room', 'King Bed', 'Occupied Clean'),
  ('802', 'Deluxe Room', 'King Bed', 'Assign Dirty'),
  ('803', 'Deluxe Twin Room', 'Twin Beds', 'Vacant Clean Pick Up'),
  ('804', 'Deluxe Twin Room', 'Twin Beds', 'Out of Service'),
  ('805', 'Premier Sea View', 'Queen Bed', 'Vacant Clean'),
  ('806', 'Premier Sea View', 'Queen Bed', 'Occupied'),
  ('901', 'Premier Sea View', 'Queen Bed', 'Assign Clean'),
  ('902', 'Premier Sea View', 'Queen Bed', 'Vacant Clean Inspected'),
  ('903', 'Premier Sea View', 'Queen Bed', 'Occupied Dirty'),
  ('904', 'Premier Sea View Room', 'Queen Bed', 'Vacant'),
  ('905', 'Premier Sea View Room', 'Queen Bed', 'Occupied Clean'),
  ('906', 'Premier Sea View Room', 'Queen Bed', 'Assign Dirty'),
  ('1001', 'Premier Sea View Room', 'Queen Bed', 'Vacant Clean Pick Up'),
  ('1002', 'Premier Sea View Room', 'Queen Bed', 'Out of Service'),
  ('1003', 'Premier Sea View Room', 'Queen Bed', 'Vacant Clean'),
  ('1004', 'Supreme', 'King Bed', 'Occupied'),
  ('1005', 'Supreme', 'King Bed', 'Assign Clean'),
  ('1006', 'Supreme', 'King Bed', 'Vacant Clean Inspected'),
  ('1101', 'Supreme', 'King Bed', 'Occupied Dirty'),
  ('1102', 'Suit', 'King Bed', 'Vacant'),
  ('1103', 'Suit', 'King Bed', 'Occupied Clean'),
  ('1104', 'Family Suite', 'Queen Bed', 'Assign Dirty'),
  ('1105', 'Family Suite', 'Queen Bed', 'Vacant Clean Pick Up'),
  ('1106', 'Executive Suite', 'King Bed', 'Out of Service'),
  ('1201', 'Executive Suite', 'King Bed', 'Vacant Clean'),
  ('1202', 'Suit', 'King Bed', 'Occupied'),
  ('1203', 'Family Suite', 'Queen Bed', 'Assign Clean'),
  ('1204', 'Family Suite', 'Queen Bed', 'Vacant Clean Inspected'),
  ('1205', 'Presidential Suite', 'Super King Bed', 'Occupied Dirty'),
  ('1206', 'Supreme', 'King Bed', 'Vacant'),
  ('V101', 'Honeymoon Pool Villa', 'King Bed', 'Occupied Clean'),
  ('V102', 'Honeymoon Pool Villa', 'King Bed', 'Assign Dirty'),
  ('V103', 'Honeymoon Pool Villa', 'King Bed', 'Vacant Clean Pick Up'),
  ('V104', 'Honeymoon Pool Villa', 'King Bed', 'Out of Service')
) as v(room_no, room_type, bed_type, status)
left join public.room_types rt on rt.name = v.room_type;

commit;

-- Verify
select count(*) as total_rooms from public.rooms;
select room_type, count(*) as qty from public.rooms group by room_type order by room_type;
