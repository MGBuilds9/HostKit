-- Idempotent production update for Kith 1423 (slug = 'kith-1423')
-- 1. Updates parking_instructions with exact P1 -> two more ramps -> P3 Spot 257 flow
-- 2. Reorders checkin_steps (1..6) in physical arrival sequence, adds keys-and-fob.jpg & parking-arrow.jpg,
--    and sets playbackRate: 0.25 on garage-to-elevator.mp4
-- 3. Ensures guest_access_code ('KITH-2485') and buzzer_name ('GUIRGUIS, M') are set
-- 4. Updates global 'Pre-Arrival Instructions' message template to include {{property.guestAccessCode}}
--    (Note: message_templates has no updated_at column in schema.ts)

BEGIN;

UPDATE properties
SET
  parking_instructions = 'On arrival, come down the first garage ramp into Level P1 and park temporarily in Visitor Parking while you buzz in and pick up the keys and black fob inside Unit 1423. Then drive through the yellow resident gate (tap the black fob): once you''re inside the garage after that first ramp, go down two more ramps to Level P3, park in Spot 257, and take the elevator up to the 14th floor.',
  buzzer_name = 'GUIRGUIS, M',
  guest_access_code = COALESCE(NULLIF(guest_access_code, ''), 'KITH-2485'),
  checkin_steps = $json$[
    {
      "step": 1,
      "title": "Say hello first",
      "description": "Call or text your host about 30 minutes before you reach the building so everything is ready for you.",
      "icon": "phone"
    },
    {
      "step": 2,
      "title": "Park in P1 Visitor",
      "description": "Turn into the main driveway, pass the first garage door on your right, curve left past the 2485 front lobby, and enter the second garage entrance down the first ramp into Level P1. Park temporarily in Visitor Parking on your right.",
      "icon": "car",
      "mediaUrl": "/guide-media/kith-1423/assets/arrival-drive.mp4",
      "mediaType": "video",
      "posterUrl": "/guide-media/kith-1423/posters/arrival-drive.jpg"
    },
    {
      "step": 3,
      "title": "Buzz in & ride to 14",
      "description": "From P1 Visitor Parking, enter the green vestibule (wave hand at WAVE TO OPEN). At the TX-3 Touch Entry System intercom, open the directory, select \"GUIRGUIS, M\", and press CALL to get buzzed in — then follow the hallway to the ground-floor elevators and head up to the 14th floor. (Arriving on foot or Uber? Use the same buzzer at the 2485 front entrance.)",
      "icon": "bell-ring",
      "mediaUrl": "/guide-media/kith-1423/assets/intercom-entry.mp4",
      "mediaType": "video",
      "posterUrl": "/guide-media/kith-1423/posters/intercom-entry.jpg"
    },
    {
      "step": 4,
      "title": "Get keys & fob",
      "description": "Enter Unit 1423 on the 14th floor and pick up the key set on the kitchen counter: unit key, SALTO card, and black proximity fob. You will need the black fob for the resident garage gate, P3 elevator lobby door, and building doors.",
      "icon": "key",
      "mediaUrl": "/guide-media/kith-1423/assets/keys-and-fob.jpg",
      "mediaType": "image"
    },
    {
      "step": 5,
      "title": "Drive to P3 Spot 257",
      "description": "Return to your car in P1 Visitor Parking and tap the black fob at the yellow resident gate. Once you're inside the garage after that first street ramp, go down two more ramps to Level P3 and park in Spot 257.",
      "icon": "square-parking",
      "mediaUrl": "/guide-media/kith-1423/assets/parking-arrow.jpg",
      "mediaType": "image"
    },
    {
      "step": 6,
      "title": "P3 elevator to 14th",
      "description": "From Spot 257 on P3, walk to the elevator vestibule door, tap the black fob on the reader to unlock it, and take the elevator up to the 14th floor to Unit 1423.",
      "icon": "arrow-up-from-line",
      "mediaUrl": "/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      "mediaType": "video",
      "posterUrl": "/guide-media/kith-1423/posters/garage-to-elevator.jpg",
      "playbackRate": 0.25
    }
  ]$json$::jsonb,
  updated_at = NOW()
WHERE slug = 'kith-1423';

UPDATE message_templates
SET
  body_template = $tpl$Hi {{guestName}},

Welcome! Your check-in time is {{property.checkinTime}} today. Here's everything you need to get settled at {{property.name}}:

--- WIFI ---
Network: {{property.wifiName}}
Password: {{property.wifiPassword}}

--- PARKING ---
Your reserved spot: {{property.parkingSpot}}
{{property.parkingInstructions}}

--- BUILDING ACCESS ---
At the intercom directory, look up {{property.buzzerName}} and press CALL. Your host will buzz you in.

--- THERMOSTAT ---
Default setting: {{property.thermostat}}

--- FULL GUIDE ---
For step-by-step arrival videos, checkout steps, house rules, and local tips, open your digital guest guide:
{{property.guideUrl}}
Access code: {{property.guestAccessCode}}

Text me if anything comes up. Enjoy your stay!

{{owner.name}}$tpl$
WHERE name = 'Pre-Arrival Instructions'
  AND is_global = true;

COMMIT;
