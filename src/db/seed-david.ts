import { db } from "./index";
import {
  owners,
  properties,
  checklistTemplates,
} from "./schema";

async function seedDavid() {
  console.log("Seeding David Guirguis + Kith 1523...");

  // ── 1. Owner (David) ──────────────────────────────────────
  const [owner] = await db
    .insert(owners)
    .values({
      name: "David Guirguis",
      email: "david@mkgbuilds.com",
      phone: "[DAVID_PHONE]",
    })
    .returning();

  console.log(`Created owner: ${owner.name} (${owner.id})`);

  // ── 2. Kith 1523 Property ─────────────────────────────────
  const [property] = await db
    .insert(properties)
    .values({
      ownerId: owner.id,

      // Identity
      name: "Kith 1523",
      slug: "kith-1523",
      description: "Your home away from home in Mississauga",

      // Address (same building, one floor up)
      addressStreet: "2485 Eglinton Avenue West",
      addressUnit: "1523",
      addressCity: "Mississauga",
      addressProvince: "ON",
      addressPostal: "L5M 2V8",
      addressCountry: "Canada",

      // Location
      latitude: "43.5465",
      longitude: "-79.6603",

      // Layout
      floor: "15th",
      layout: "2BR / 2BA",
      beds: [
        { type: "Queen", count: 1, location: "Primary Bedroom" },
        { type: "Single", count: 2, location: "Second Bedroom" },
        { type: "Pull-out Sofa", count: 1, location: "Living Room" },
      ],

      // Access
      wifiName: "DG-1523",
      wifiPassword: "Welcome123!/@",
      parkingSpot: "P3-258",
      parkingInstructions:
        "Resident parking is accessed through the yellow gate near the visitor parking entrance. You may need to use the fob to open the garage door. Your spot number (P3-258) is clearly marked on the wall.",
      buzzerName: "Guirguis D.",
      buzzerInstructions:
        'At the building entrance buzzer/intercom, select "Guirguis D." from the directory. The door will be unlocked for you.',

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
            'At the buzzer, select "Guirguis D." from the directory. The door will unlock automatically.',
          icon: "door-open",
        },
        {
          step: 4,
          title: "Go to Unit 1523",
          description:
            "Take the elevator to the 15th floor. Your keys and fob will be on the kitchen counter inside the unit.",
          icon: "key",
        },
        {
          step: 5,
          title: "Move Your Car",
          description:
            "Return to the garage. Instead of going right to visitor parking, take the yellow gate to resident parking. Your spot is P3-258. You may need the fob for the garage door.",
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

      // Nearby Services (same building)
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
      ownerPhone: "[DAVID_PHONE]",

      // Thermostat
      thermostatDefault: "22°C",

      // State
      active: true,
    })
    .returning();

  console.log(`Created property: ${property.name} (${property.id})`);

  // ── 3. Checklist Template for Kith 1523 ────────────────────
  const [checklist] = await db
    .insert(checklistTemplates)
    .values({
      propertyId: property.id,
      name: "Standard Turnover",
      isGlobal: false,
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
            { label: "Test WiFi (network: DG-1523)", type: "check" },
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

  console.log(`Created checklist template: ${checklist.name} (${checklist.id})`);

  console.log("David seed complete!");
  process.exit(0);
}

seedDavid().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
