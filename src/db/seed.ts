import { db } from "./index";
import {
  users,
  owners,
  properties,
  messageTemplates,
  checklistTemplates,
} from "./schema";

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
  const [property] = await db
    .insert(properties)
    .values({
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
        "Resident parking is accessed through the yellow gate near the visitor parking entrance. You may need to use the fob to open the garage door. Your spot number (P3-257) is clearly marked on the wall.",
      buzzerName: "George A.",
      buzzerInstructions:
        'At the building entrance buzzer/intercom, select "George A." from the directory. The door will be unlocked for you.',

      // Check-in / Check-out
      checkinTime: "15:00",
      checkoutTime: "11:00",
      preArrivalLeadMins: 30,
      checkinSteps: [
        {
          step: 1,
          title: "Park in Visitor Parking",
          description:
            "As you enter the underground garage, follow the signs to visitor parking. Park in any available visitor spot.",
          icon: "car",
        },
        {
          step: 2,
          title: "One Person Goes Up",
          description:
            "Only the reservation holder should go to the unit first — no luggage yet. This is required for key handoff.",
          icon: "user",
        },
        {
          step: 3,
          title: "Enter the Building",
          description:
            'At the buzzer, select "George A." from the directory. The door will unlock automatically.',
          icon: "door-open",
        },
        {
          step: 4,
          title: "Go to Unit 1423",
          description:
            "Take the elevator to the 14th floor. Your keys and fob will be on the kitchen counter inside the unit.",
          icon: "key",
        },
        {
          step: 5,
          title: "Move Your Car",
          description:
            "Return to the garage. Instead of going right to visitor parking, take the yellow gate to resident parking. Your spot is P3-257. You may need the fob for the garage door.",
          icon: "square-parking",
        },
        {
          step: 6,
          title: "Unload & Settle In",
          description:
            "Bring up your luggage. Use the fob to access the door between the parking garage and the elevator. Welcome home!",
          icon: "luggage",
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
      ],

      // Nearby Services
      nearbyServices: [
        {
          name: "Fortinos",
          category: "grocery",
          distance: "350m",
          googleMapsUrl:
            "https://maps.google.com/?q=Fortinos+Eglinton+Mississauga",
          phone: "+19058286886",
        },
        {
          name: "Shoppers Drug Mart",
          category: "pharmacy",
          distance: "400m",
          googleMapsUrl:
            "https://maps.google.com/?q=Shoppers+Drug+Mart+Eglinton+Mississauga",
          phone: "+19058286677",
        },
        {
          name: "Trillium Health Partners (Credit Valley)",
          category: "hospital",
          distance: "3.5km",
          googleMapsUrl:
            "https://maps.google.com/?q=Credit+Valley+Hospital",
          phone: "+19058131100",
          notes: "Nearest ER",
        },
        {
          name: "MiWay Transit",
          category: "transit",
          notes: "Bus stops on Eglinton Ave — routes 19 and 101",
        },
        {
          name: "Erin Mills Town Centre",
          category: "entertainment",
          distance: "2km",
          googleMapsUrl:
            "https://maps.google.com/?q=Erin+Mills+Town+Centre",
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
    })
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
