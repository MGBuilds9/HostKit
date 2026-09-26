import { db } from "./index";
import {
  users,
  owners,
  properties,
  messageTemplates,
  checklistTemplates,
} from "./schema";
import type { InferInsertModel } from "drizzle-orm";

// drizzle's `properties` table is large enough that TS can overflow inference
// on the inline object literal; typing the value explicitly avoids that.
type NewProperty = InferInsertModel<typeof properties>;

async function seed() {
  console.log("Seeding database...");

  // ── 1. Admin User (Mariam) ──────────────────────────────────
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Mariam",
      email: "mariam@example.com",
      role: "admin",
    })
    .returning();

  console.log(`Created admin user: ${adminUser.name} (${adminUser.id})`);

  // ── 2. Owner (MG) ──────────────────────────────────────────
  const [owner] = await db
    .insert(owners)
    .values({
      name: "Michael Guirguis",
      email: "mg@mkgbuilds.com",
      phone: "[MG_PHONE]",
    })
    .returning();

  console.log(`Created owner: ${owner.name} (${owner.id})`);

  // ── 3. Kith 1423 Property ───────────────────────────────────
  const newProperty: NewProperty = {
    ownerId: owner.id,

      // Identity
      name: "Kith 1423",
      slug: "kith-1423",
      description: "Your home away from home in Mississauga",

      // Address
      addressStreet: "2485 Eglinton Avenue West",
      addressUnit: "1423",
      addressCity: "Mississauga",
      addressProvince: "ON",
      addressPostal: "L5M 2V8",
      addressCountry: "Canada",

      // Location
      latitude: "43.5465",
      longitude: "-79.6603",

      // Layout
      floor: "14th",
      layout: "2BR / 2BA",
      beds: [
        { type: "Queen", count: 1, location: "Primary Bedroom" },
        { type: "Single", count: 2, location: "Second Bedroom" },
        { type: "Pull-out Sofa", count: 1, location: "Living Room" },
      ],

      // Access
      wifiName: "MG-1423",
      wifiPassword: "Welcome123!/@",
      parkingSpot: "P3-257",
      parkingInstructions:
        "On arrival day, come through visitor parking first, then move to your assigned spot P3-257 (parking level 3) once you are checked in. You may need the fob to open the garage door.",
      buzzerName: "GUIRGUIS, M",
      buzzerInstructions:
        'At the TX-3 Touch Entry System intercom, open the resident directory, find "GUIRGUIS, M", then press CALL. Your host will buzz you in.',
      // Gates the public guide at /g/kith-1423 behind this shared code.
      guestAccessCode: "KITH-2485",

      // Check-in / Check-out
      checkinTime: "15:00",
      checkoutTime: "11:00",
      preArrivalLeadMins: 30,
      checkinSteps: [
        {
          step: 1,
          title: "Say hello before arrival",
          description:
            "Call or text Mariam about 30 minutes before you reach the building so everything is ready for you.",
          icon: "phone",
        },
        {
          step: 2,
          title: "Drive in and park",
          description:
            "Head into the parking garage and use visitor parking first on arrival. Your assigned spot for the stay is P3-257. Follow the marked direction once inside the garage.",
          icon: "car",
          mediaUrl: "/guide-media/kith-1423/assets/arrival-drive.mp4",
          mediaType: "video",
          posterUrl: "/guide-media/kith-1423/posters/arrival-drive.jpg",
        },
        {
          step: 3,
          title: "Get buzzed in",
          description:
            'At the TX-3 Touch Entry System intercom, open the resident directory and look for "GUIRGUIS, M", then press CALL. Your host will buzz you in.',
          icon: "bell-ring",
          mediaUrl: "/guide-media/kith-1423/assets/intercom-entry.mp4",
          mediaType: "video",
          posterUrl: "/guide-media/kith-1423/posters/intercom-entry.jpg",
        },
        {
          step: 4,
          title: "Garage to elevator",
          description:
            "From the garage, walk through the door and take the elevator up to the 14th floor.",
          icon: "arrow-up-from-line",
          mediaUrl: "/guide-media/kith-1423/assets/garage-to-elevator.mp4",
          mediaType: "video",
          posterUrl: "/guide-media/kith-1423/posters/garage-to-elevator.jpg",
        },
        {
          step: 5,
          title: "Find your unit",
          description:
            "Walk down the 14th floor hallway to Unit 1423. The key and fob are waiting for you inside.",
          icon: "key",
          mediaUrl: "/guide-media/kith-1423/assets/hallway-to-unit.mp4",
          mediaType: "video",
          posterUrl: "/guide-media/kith-1423/posters/hallway-to-unit.jpg",
        },
        {
          step: 6,
          title: "Keys & fob",
          description:
            "Your set for the stay is a SALTO access card plus the unit key with the black fob. Tap the black fob on the SALTO reader next to doors to unlock them.",
          icon: "contact-round",
          mediaUrl: "/guide-media/kith-1423/assets/fob-and-garbage-room.mp4",
          mediaType: "video",
          posterUrl: "/guide-media/kith-1423/posters/fob-and-garbage-room.jpg",
        },
      ],
      checkoutSteps: [
        {
          step: 1,
          title: "Gather Towels",
          description:
            "Place all used towels in the bathtub or on the bathroom floor.",
        },
        {
          step: 2,
          title: "Dishes",
          description:
            "Load and start the dishwasher, or hand wash any dishes you used.",
        },
        {
          step: 3,
          title: "Garbage",
          description:
            "Take out any personal garbage to the garbage room on your floor.",
        },
        {
          step: 4,
          title: "Lights & Appliances",
          description: "Turn off all lights, TV, and appliances.",
        },
        {
          step: 5,
          title: "Windows",
          description: "Close all windows.",
        },
        {
          step: 6,
          title: "Keys",
          description:
            "Leave keys and fob on the kitchen counter. Lock the door behind you.",
        },
        {
          step: 7,
          title: "Thermostat",
          description: "Set thermostat to 22°C.",
        },
      ],

      // Rules & Policies
      houseRules: [
        { rule: "No smoking — strictly prohibited", icon: "cigarette-off" },
        { rule: "No pets allowed", icon: "paw-print" },
        { rule: "No parties or events", icon: "party-popper" },
        { rule: "Quiet hours after 10 PM", icon: "moon" },
        {
          rule: "Do not contact building security or concierge",
          icon: "shield-alert",
        },
      ],
      securityNote:
        "Building security and concierge do not service short-term rentals. Please do not interact with them. For any questions or issues, contact your host directly.",
      idRequired: true,
      idLeadHours: 72,
      thirdPartyAllowed: false,

      // Amenities
      kitchenAmenities: [
        "Coffee machine",
        "Kettle",
        "Toaster",
        "Dishwasher",
        "Pots & pans",
        "Baking tray",
        "Full cutlery set",
        "Cutting board",
        "Strainer",
        "Peeler",
        "Grater",
        "Tongs",
        "Wine glasses",
        "Measuring cups",
        "Mixing bowl",
        "Oven mitts",
        "Dish soap",
        "Sponge",
        "Dishwasher pods",
        "Coffee, tea, sugar, salt & pepper provided",
      ],
      bathroomAmenities: [
        "Shampoo",
        "Conditioner",
        "Body wash",
        "Hand soap",
        "Hair dryer",
        "Bidet",
        "First aid kit",
        "Fresh towels (body & face)",
        "Toilet paper",
      ],
      generalAmenities: [
        "In-unit laundry (pods & dryer sheets provided)",
        "Iron & ironing board",
        "Desk & office chair",
        "Fire extinguisher",
        "Candy welcome jars",
        "Extra bedding in closet",
        "Hangers in every closet",
        "Remote-controlled bedroom blinds (up arrow raises, down arrow lowers, square stops)",
      ],

      // Nearby Services
      nearbyServices: [
        {
          name: "Erin Mills Town Centre",
          category: "entertainment",
          distance: "2 min walk",
          notes: "Shopping and dining, just across the street",
          googleMapsUrl:
            "https://maps.google.com/?q=Erin+Mills+Town+Centre",
        },
        {
          name: "Walmart (5100 Erin Mills Pkwy)",
          category: "grocery",
          distance: "Steps away",
          notes: "Grocery and pharmacy, open 8 AM–10 PM daily",
          googleMapsUrl: "https://maps.google.com/?q=Walmart+5100+Erin+Mills+Pkwy",
        },
        {
          name: "Trillium Health Partners (Credit Valley)",
          category: "hospital",
          distance: "2 min walk",
          notes: "Nearest ER, just across Eglinton Ave W",
          googleMapsUrl:
            "https://maps.google.com/?q=Credit+Valley+Hospital",
          phone: "+19058131100",
        },
        {
          name: "Transit",
          category: "transit",
          notes:
            "Bus stops across the street; Erin Mills Station nearby (MiWay, GO Bus, Oakville Transit). Quick access to Highways 403 & 407.",
        },
      ],

      // Emergency / Contact
      emergencyContact: "911",
      hostPhone: "[MARIAM_PHONE]",
      ownerPhone: "[MG_PHONE]",

      // Thermostat
      thermostatDefault: "22°C",

      // State
      active: true,
  };
  const [property] = await db
    .insert(properties)
    .values(newProperty)
    .returning();

  console.log(`Created property: ${property.name} (${property.id})`);

  // ── 4. Global Message Templates ────────────────────────────
  const templates = [
    {
      name: "Pre-Booking Screening",
      triggerDescription: "When a guest sends a booking inquiry",
      sortOrder: 1,
      bodyTemplate: `Hi {{guestName}},

Thanks for your interest in {{property.name}}!

Before I confirm the booking, I just want to make sure we're a great fit. Here are a few quick questions:

1. What is the purpose of your stay?
2. How many guests will be staying?
3. Are you comfortable with our house rules (no smoking, no pets, no parties, quiet hours after 10 PM)?
4. Are you able to provide a government-issued photo ID for all adult guests at least {{property.idLeadHours}} hours before check-in?

Please note: this listing does not accept third-party bookings — the reservation holder must be one of the guests staying.

Looking forward to hearing from you!

{{owner.name}}`,
    },
    {
      name: "Booking Confirmation",
      triggerDescription: "Immediately after a booking is confirmed",
      sortOrder: 2,
      bodyTemplate: `Hi {{guestName}},

Your booking at {{property.name}} is confirmed!

Here are your stay details:
- Check-in: {{checkinDate}} after {{property.checkinTime}}
- Check-out: {{checkoutDate}} by {{property.checkoutTime}}
- Address: {{property.addressFull}}

One important step: please send a photo of your government-issued ID at least {{property.idLeadHours}} hours before check-in. This is required to receive your access details.

You'll receive full check-in instructions (WiFi, parking, access code) 30 minutes before check-in once your ID is verified.

Can't wait to host you!

{{owner.name}}`,
    },
    {
      name: "ID Reminder",
      triggerDescription:
        "If guest has not sent ID within 24 hours of booking or 72 hours before check-in",
      sortOrder: 3,
      bodyTemplate: `Hi {{guestName}},

Just a friendly reminder — we still need a photo of your government-issued ID before we can send your check-in details for {{property.name}}.

Please send it at your earliest convenience. Check-in is {{checkinDate}} at {{property.checkinTime}}, and we need the ID at least {{property.idLeadHours}} hours before then.

If you have any questions, don't hesitate to reach out!

{{owner.name}}`,
    },
    {
      name: "Pre-Arrival Instructions",
      triggerDescription: "30 minutes before check-in time on check-in day",
      sortOrder: 4,
      bodyTemplate: `Hi {{guestName}},

Welcome! Your check-in time is {{property.checkinTime}} today. Here's everything you need to get settled at {{property.name}}:

--- WIFI ---
Network: {{property.wifiName}}
Password: {{property.wifiPassword}}

--- PARKING ---
Your reserved spot: {{property.parkingSpot}}
{{property.parkingInstructions}}

--- BUILDING ACCESS ---
At the front buzzer, look up {{property.buzzerName}} in the directory. The door will unlock automatically.

--- THERMOSTAT ---
Default setting: {{property.thermostat}}

--- FULL GUIDE ---
For everything else (checkout steps, nearby restaurants, house rules, and more), check your digital guest guide:
{{property.guideUrl}}

Text me if anything comes up. Enjoy your stay!

{{owner.name}}`,
    },
    {
      name: "Check-In Follow-Up",
      triggerDescription: "Evening of check-in day (around 7–8 PM)",
      sortOrder: 5,
      bodyTemplate: `Hi {{guestName}},

Just checking in — hope you've settled in comfortably at {{property.name}}!

Is everything looking good? If there's anything you need or if something seems off, please let me know right away and I'll take care of it.

Enjoy your stay!

{{owner.name}}`,
    },
    {
      name: "Checkout Reminder",
      triggerDescription: "Evening before checkout day",
      sortOrder: 6,
      bodyTemplate: `Hi {{guestName}},

Just a reminder that checkout is tomorrow ({{checkoutDate}}) by {{property.checkoutTime}}.

Here's the checkout checklist:
1. Place all used towels in the bathtub or bathroom floor
2. Load and start the dishwasher (or hand wash any dishes)
3. Take out personal garbage to the garbage room on your floor
4. Turn off all lights, TV, and appliances
5. Close all windows
6. Set thermostat to {{property.thermostat}}
7. Leave keys and fob on the kitchen counter — lock the door behind you

No need to strip the beds.

Thanks so much for staying — it was a pleasure hosting you!

{{owner.name}}`,
    },
    {
      name: "Review Request",
      triggerDescription: "24–48 hours after checkout",
      sortOrder: 7,
      bodyTemplate: `Hi {{guestName}},

It was a pleasure hosting you at {{property.name}}! I hope you had a wonderful stay.

If you have a moment, I'd really appreciate it if you could leave a review on the platform. Reviews help future guests know what to expect, and they mean a lot to us as hosts.

If there was anything that could have been better, please don't hesitate to reach out directly — I always want to improve.

Thanks again, and I hope to host you again someday!

{{owner.name}}`,
    },
  ];

  for (const template of templates) {
    const [created] = await db
      .insert(messageTemplates)
      .values({
        propertyId: null,
        name: template.name,
        triggerDescription: template.triggerDescription,
        bodyTemplate: template.bodyTemplate,
        sortOrder: template.sortOrder,
        isGlobal: true,
        active: true,
      })
      .returning();
    console.log(
      `Created message template: ${created.name} (${created.id})`
    );
  }

  // ── 5. Default Turnover Checklist Template ─────────────────
  const [checklist] = await db
    .insert(checklistTemplates)
    .values({
      propertyId: null,
      name: "Standard Turnover",
      isGlobal: true,
      sections: [
        {
          title: "Kitchen",
          items: [
            { label: "Wipe down all countertops", type: "check" },
            { label: "Clean stovetop and drip trays", type: "check" },
            { label: "Wipe inside microwave", type: "check" },
            { label: "Wipe outside of appliances (fridge, microwave, oven)", type: "check" },
            { label: "Empty and wipe sink", type: "check" },
            { label: "Load and run dishwasher (or confirm dishes are clean)", type: "check" },
            { label: "Restock dish soap and sponge", type: "restock" },
            { label: "Restock dishwasher pods", type: "restock" },
            { label: "Restock coffee, tea, sugar, salt & pepper", type: "restock" },
            { label: "Empty garbage and replace liner", type: "check" },
            { label: "Deep clean inside fridge", type: "deep_clean" },
            { label: "Deep clean oven interior", type: "deep_clean" },
          ],
        },
        {
          title: "Bathrooms",
          items: [
            { label: "Clean and disinfect toilet (inside and out)", type: "check" },
            { label: "Clean sink and faucet", type: "check" },
            { label: "Clean shower/tub walls and floor", type: "check" },
            { label: "Wipe mirror", type: "check" },
            { label: "Wipe counters and light switches", type: "check" },
            { label: "Replace towels with fresh set (body & face)", type: "restock" },
            { label: "Restock toilet paper (minimum 2 rolls per bathroom)", type: "restock" },
            { label: "Restock shampoo, conditioner, body wash, hand soap", type: "restock" },
            { label: "Empty garbage and replace liner", type: "check" },
            { label: "Clean bidet nozzle", type: "monthly" },
            { label: "Deep clean grout", type: "deep_clean" },
          ],
        },
        {
          title: "Bedrooms",
          items: [
            { label: "Strip and replace all bed linens", type: "check" },
            { label: "Fluff and arrange pillows", type: "check" },
            { label: "Check under bed for left items", type: "check" },
            { label: "Wipe bedside tables and lamps", type: "check" },
            { label: "Confirm extra bedding is in closet", type: "check" },
            { label: "Confirm hangers are in closet", type: "check" },
            { label: "Vacuum floor", type: "check" },
            { label: "Flip or rotate mattress", type: "monthly" },
          ],
        },
        {
          title: "Living Room",
          items: [
            { label: "Wipe down coffee table and surfaces", type: "check" },
            { label: "Arrange cushions on sofa", type: "check" },
            { label: "Check pull-out sofa for cleanliness", type: "check" },
            { label: "Dust TV and media unit", type: "check" },
            { label: "Vacuum sofa and cushions", type: "check" },
            { label: "Vacuum floor", type: "check" },
            { label: "Confirm TV remote and batteries work", type: "check" },
            { label: "Refill candy welcome jars", type: "restock" },
          ],
        },
        {
          title: "General",
          items: [
            { label: "Wipe all light switches and door handles", type: "check" },
            { label: "Close and lock all windows", type: "check" },
            { label: "Set thermostat to 22°C", type: "check" },
            { label: "Confirm keys and fob are on kitchen counter", type: "check" },
            { label: "Test WiFi (network: MG-1423)", type: "check" },
            { label: "Sweep/mop all hard floors", type: "check" },
            { label: "Take out all garbage to garbage room", type: "check" },
            { label: "Confirm in-unit laundry pods and dryer sheets are stocked", type: "restock" },
            { label: "Confirm iron and ironing board are accessible", type: "check" },
            { label: "Check fire extinguisher indicator is in the green", type: "monthly" },
            { label: "Deep clean baseboards and window sills", type: "deep_clean" },
            { label: "Photograph unit before guest arrival", type: "check" },
          ],
        },
      ],
    })
    .returning();

  console.log(
    `Created checklist template: ${checklist.name} (${checklist.id})`
  );

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
