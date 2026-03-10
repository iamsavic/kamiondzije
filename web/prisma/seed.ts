import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { name: "SUPER_ADMIN", description: "Puni pristup, podešavanja i korisnici" },
  { name: "FLEET_ADMIN", description: "Administrator voznog parka" },
  { name: "DISPATCHER", description: "Operater / dispečer" },
  { name: "DRIVER", description: "Vozač" },
  { name: "VIEWER", description: "Menadžment, samo pregled" },
];

async function main() {
  // ── Uloge
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { description: role.description },
    });
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role not found");

  // ── Organizacija
  const org = await prisma.organization.upsert({
    where: { slug: "flota-rs" },
    create: { name: "Flota Transport d.o.o.", slug: "flota-rs" },
    update: {},
  });

  // ── Admin korisnik
  const defaultEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fleet.local";
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const existingAdmin = await prisma.user.findUnique({ where: { email: defaultEmail.toLowerCase() } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: defaultEmail.toLowerCase(),
        name: "Admin",
        passwordHash: await hash(defaultPassword, 10),
        roleId: superAdminRole.id,
        organizationId: org.id,
        isActive: true,
      },
    });
    console.log(`Korisnik kreiran: ${defaultEmail} (lozinka: ${defaultPassword})`);
  } else {
    // Ensure organizationId is set (might be null if user was created before org)
    if (!existingAdmin.organizationId) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { organizationId: org.id },
      });
      console.log(`Korisnik ažuriran (organizationId dodat): ${defaultEmail}`);
    } else {
      console.log(`Korisnik već postoji: ${defaultEmail}`);
    }
  }

  // ── Vozila
  const vehiclesData = [
    {
      registrationNumber: "BG-123-AB",
      vin: "WDB9634031L372001",
      make: "Mercedes-Benz",
      model: "Actros 1845",
      year: 2021,
      fuelType: "Dizel",
      engineDisplacement: 12809,
      powerKw: 330,
      firstRegistration: new Date("2021-03-15"),
      status: "active",
      purchaseDate: new Date("2021-03-10"),
      purchasePrice: 95000,
      currentValue: 75000,
      acquisitionType: "purchase",
      notes: "Tegljač, Euro 6, automatski menjač",
    },
    {
      registrationNumber: "NS-456-CD",
      vin: "YV2RS01A3YB123456",
      make: "Volvo",
      model: "FH 500",
      year: 2020,
      fuelType: "Dizel",
      engineDisplacement: 12777,
      powerKw: 368,
      firstRegistration: new Date("2020-06-01"),
      status: "active",
      purchaseDate: new Date("2020-05-20"),
      purchasePrice: 110000,
      currentValue: 82000,
      acquisitionType: "leasing",
      leasingCompany: "UniCredit Leasing",
      leasingContractNo: "UCL-2020-4521",
      leasingStart: new Date("2020-06-01"),
      leasingEnd: new Date("2025-06-01"),
      leasingMonthly: 1850,
      notes: "I-Shift menjač, hladnjača prikolica",
    },
    {
      registrationNumber: "NI-789-EF",
      vin: "XLRTEF360G2123789",
      make: "DAF",
      model: "XF 480",
      year: 2022,
      fuelType: "Dizel",
      engineDisplacement: 12902,
      powerKw: 353,
      firstRegistration: new Date("2022-01-20"),
      status: "active",
      purchaseDate: new Date("2022-01-10"),
      purchasePrice: 105000,
      currentValue: 90000,
      acquisitionType: "purchase",
      notes: "TraXon menjač, Space Cab",
    },
    {
      registrationNumber: "KG-321-GH",
      vin: "W0L000000Y2123456",
      make: "MAN",
      model: "TGX 18.440",
      year: 2019,
      fuelType: "Dizel",
      engineDisplacement: 10518,
      powerKw: 324,
      firstRegistration: new Date("2019-09-10"),
      status: "in_service",
      purchaseDate: new Date("2019-09-01"),
      purchasePrice: 88000,
      currentValue: 55000,
      acquisitionType: "purchase",
      notes: "Trenutno na redovnom godišnjem servisu — zamena ulja i filtera",
    },
    {
      registrationNumber: "SM-654-IJ",
      vin: "VF6EF000000234561",
      make: "Scania",
      model: "R 450",
      year: 2023,
      fuelType: "Dizel",
      engineDisplacement: 12742,
      powerKw: 331,
      firstRegistration: new Date("2023-04-05"),
      status: "active",
      purchaseDate: new Date("2023-04-01"),
      purchasePrice: 125000,
      currentValue: 115000,
      acquisitionType: "leasing",
      leasingCompany: "Erste Leasing",
      leasingContractNo: "EL-2023-8810",
      leasingStart: new Date("2023-04-05"),
      leasingEnd: new Date("2029-04-05"),
      leasingMonthly: 2100,
      notes: "Najnoviji u floti — Euro 6e, Opticruise",
    },
    {
      registrationNumber: "ZR-987-KL",
      vin: "YV2AS01AXWB987654",
      make: "Iveco",
      model: "Stralis Hi-Way 480",
      year: 2018,
      fuelType: "Dizel",
      engineDisplacement: 12880,
      powerKw: 353,
      firstRegistration: new Date("2018-05-12"),
      status: "active",
      purchaseDate: new Date("2018-05-01"),
      purchasePrice: 82000,
      currentValue: 42000,
      acquisitionType: "purchase",
      notes: "Stariji kamion, planiran zamena 2026.",
    },
  ];

  const createdVehicles: { id: string; registrationNumber: string }[] = [];

  for (const v of vehiclesData) {
    const existing = await prisma.vehicle.findFirst({
      where: { organizationId: org.id, registrationNumber: v.registrationNumber },
    });
    if (existing) {
      createdVehicles.push({ id: existing.id, registrationNumber: existing.registrationNumber });
      console.log(`Vozilo već postoji: ${v.registrationNumber}`);
      continue;
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        ...v,
        purchasePrice: v.purchasePrice as unknown as never,
        currentValue: v.currentValue as unknown as never,
        leasingMonthly: ("leasingMonthly" in v ? v.leasingMonthly : null) as unknown as never,
      },
    });
    createdVehicles.push({ id: vehicle.id, registrationNumber: vehicle.registrationNumber });
    console.log(`Vozilo kreirano: ${v.registrationNumber} (${v.make} ${v.model})`);
  }

  // ── Dokumenta vozila (registracija, osiguranje, zeleni/žuti karton)
  const today = new Date();
  const future = (days: number) => new Date(today.getTime() + days * 86400000);
  const past = (days: number) => new Date(today.getTime() - days * 86400000);

  const vehicleDocs = [
    // BG-123-AB — sve OK
    { idx: 0, type: "registration",    validFrom: past(30),  validTo: future(335), docNumber: "BG-2025-00123" },
    { idx: 0, type: "insurance",       validFrom: past(60),  validTo: future(305), docNumber: "POL-2025-11001" },
    { idx: 0, type: "green_card",      validFrom: past(60),  validTo: future(180), docNumber: "GC-2025-00045" },
    // NS-456-CD — osiguranje ističe za 28 dana (narandžasto)
    { idx: 1, type: "registration",    validFrom: past(30),  validTo: future(335), docNumber: "NS-2025-00456" },
    { idx: 1, type: "insurance",       validFrom: past(337), validTo: future(28),  docNumber: "POL-2025-11002" },
    { idx: 1, type: "green_card",      validFrom: past(30),  validTo: future(210), docNumber: "GC-2025-00046" },
    // NI-789-EF — sve OK
    { idx: 2, type: "registration",    validFrom: past(15),  validTo: future(350), docNumber: "NI-2025-00789" },
    { idx: 2, type: "insurance",       validFrom: past(15),  validTo: future(350), docNumber: "POL-2025-11003" },
    { idx: 2, type: "green_card",      validFrom: past(15),  validTo: future(270), docNumber: "GC-2025-00047" },
    // KG-321-GH — registracija ističe za 4 dana (crveno!)
    { idx: 3, type: "registration",    validFrom: past(361), validTo: future(4),   docNumber: "KG-2024-00321" },
    { idx: 3, type: "insurance",       validFrom: past(30),  validTo: future(335), docNumber: "POL-2025-11004" },
    { idx: 3, type: "green_card",      validFrom: past(30),  validTo: future(335), docNumber: "GC-2025-00048" },
    // SM-654-IJ — sve OK
    { idx: 4, type: "registration",    validFrom: past(10),  validTo: future(355), docNumber: "SM-2025-00654" },
    { idx: 4, type: "insurance",       validFrom: past(10),  validTo: future(355), docNumber: "POL-2025-11005" },
    { idx: 4, type: "green_card",      validFrom: past(10),  validTo: future(270), docNumber: "GC-2025-00049" },
    // ZR-987-KL — zeleni karton istekao (tamnocrveno)
    { idx: 5, type: "registration",    validFrom: past(30),  validTo: future(335), docNumber: "ZR-2025-00987" },
    { idx: 5, type: "insurance",       validFrom: past(30),  validTo: future(335), docNumber: "POL-2025-11006" },
    { idx: 5, type: "green_card",      validFrom: past(200), validTo: past(10),    docNumber: "GC-2024-00050" },
  ];

  for (const doc of vehicleDocs) {
    const vehicle = createdVehicles[doc.idx];
    if (!vehicle) continue;
    const exists = await prisma.vehicleDocument.findFirst({
      where: { vehicleId: vehicle.id, type: doc.type, documentNumber: doc.docNumber },
    });
    if (!exists) {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId: vehicle.id,
          type: doc.type,
          documentNumber: doc.docNumber,
          validFrom: doc.validFrom,
          validTo: doc.validTo,
        },
      });
    }
  }
  console.log("Dokumenta vozila kreirana.");

  // ── Vozači
  const driversData = [
    {
      firstName: "Marko",
      lastName: "Petrović",
      externalId: "0105982800012",
      phone: "+381641234567",
      email: "m.petrovic@flota.rs",
      address: "Cara Dušana 14, Beograd",
      jobTitle: "Vozač kategorije CE",
      employmentStartDate: new Date("2018-04-01"),
      employmentStatus: "active",
      licenseNumber: "LIC-BG-000123",
      licenseCategories: "B,C,CE",
      licenseExpiry: future(420),
      idCardNumber: "ID-BG-112233",
      idCardExpiry: future(700),
      notes: "Iskusan vozač, međunarodne rute",
    },
    {
      firstName: "Nikola",
      lastName: "Jovanović",
      externalId: "1507985710023",
      phone: "+381652345678",
      email: "n.jovanovic@flota.rs",
      address: "Bulevar Oslobođenja 88, Novi Sad",
      jobTitle: "Vozač kategorije CE",
      employmentStartDate: new Date("2020-09-15"),
      employmentStatus: "active",
      licenseNumber: "LIC-NS-000456",
      licenseCategories: "B,C,CE",
      licenseExpiry: future(22),   // ističe za 22 dana — narandžasto!
      idCardNumber: "ID-NS-445566",
      idCardExpiry: future(500),
      notes: "Specijalizovan za hladnjaču",
    },
    {
      firstName: "Dragan",
      lastName: "Stojanović",
      externalId: "2203975780034",
      phone: "+381663456789",
      email: "d.stojanovic@flota.rs",
      address: "Vojvode Mišića 5, Niš",
      jobTitle: "Vozač kategorije C",
      employmentStartDate: new Date("2015-01-10"),
      employmentStatus: "active",
      licenseNumber: "LIC-NI-000789",
      licenseCategories: "B,C",
      licenseExpiry: future(180),
      idCardNumber: "ID-NI-778899",
      idCardExpiry: past(5),  // lična karta ISTEKLA — tamnocrveno!
      notes: "Veteran firme, domaće rute",
    },
    {
      firstName: "Stefan",
      lastName: "Đorđević",
      externalId: "0809990800045",
      phone: "+381674567890",
      email: "s.djordjevic@flota.rs",
      address: "Kneza Miloša 22, Kragujevac",
      jobTitle: "Vozač kategorije CE",
      employmentStartDate: new Date("2023-03-01"),
      employmentStatus: "active",
      licenseNumber: "LIC-KG-001010",
      licenseCategories: "B,C,CE",
      licenseExpiry: future(850),
      idCardNumber: "ID-KG-334455",
      idCardExpiry: future(1100),
      notes: "Najmlađi vozač, na probnom periodu do 2024.",
    },
  ];

  const createdDrivers: { id: string; firstName: string; lastName: string }[] = [];

  for (const d of driversData) {
    const exists = await prisma.driver.findFirst({
      where: { organizationId: org.id, externalId: d.externalId },
    });
    if (exists) {
      createdDrivers.push({ id: exists.id, firstName: exists.firstName, lastName: exists.lastName });
      console.log(`Vozač već postoji: ${d.firstName} ${d.lastName}`);
      continue;
    }
    const driver = await prisma.driver.create({
      data: { organizationId: org.id, ...d },
    });
    createdDrivers.push({ id: driver.id, firstName: driver.firstName, lastName: driver.lastName });
    console.log(`Vozač kreiran: ${d.firstName} ${d.lastName}`);
  }

  // ── Zaduženja: svaki aktivni vozač zadužuje po jedno vozilo
  const assignments = [
    { driverIdx: 0, vehicleIdx: 0 }, // Marko -> BG-123-AB (Mercedes)
    { driverIdx: 1, vehicleIdx: 1 }, // Nikola -> NS-456-CD (Volvo)
    { driverIdx: 2, vehicleIdx: 2 }, // Dragan -> NI-789-EF (DAF)
    { driverIdx: 3, vehicleIdx: 4 }, // Stefan -> SM-654-IJ (Scania)
  ];

  for (const a of assignments) {
    const driver = createdDrivers[a.driverIdx];
    const vehicle = createdVehicles[a.vehicleIdx];
    if (!driver || !vehicle) continue;
    const exists = await prisma.driverAssignment.findFirst({
      where: { driverId: driver.id, vehicleId: vehicle.id, status: "active" },
    });
    if (!exists) {
      await prisma.driverAssignment.create({
        data: {
          driverId: driver.id,
          vehicleId: vehicle.id,
          type: "vehicle",
          assignedAt: new Date(),
          status: "active",
        },
      });
    }
  }
  console.log("Zaduženja kreirana.");

  // ── Servisni zapisi
  const serviceRecords = [
    {
      vehicleIdx: 0,
      type: "routine",
      sentAt: past(60),
      completedAt: past(58),
      description: "Redovan servis: zamena ulja 10W-40, filteri ulja/vazduha/goriva, provera kočnica",
      workshop: "Auto Centar Beograd",
      invoiceAmount: 850,
      invoiceNumber: "RAC-2025-01001",
      nextServiceKm: 580000,
      nextServiceDate: future(180),
    },
    {
      vehicleIdx: 1,
      type: "repair",
      sentAt: past(30),
      completedAt: past(27),
      description: "Zamena alternatora i klinastog remena",
      workshop: "Volvo Servis Novi Sad",
      invoiceAmount: 2200,
      invoiceNumber: "RAC-2025-02001",
      nextServiceKm: null,
      nextServiceDate: future(90),
    },
    {
      vehicleIdx: 3,
      type: "routine",
      sentAt: past(3),
      completedAt: null,
      description: "Redovni godišnji servis — zamena ulja, filteri, pregled kočionog sistema",
      workshop: "MAN Servis Srbija",
      invoiceAmount: null,
      invoiceNumber: null,
      nextServiceKm: 490000,
      nextServiceDate: future(365),
    },
    {
      vehicleIdx: 5,
      type: "preventive",
      sentAt: past(90),
      completedAt: past(88),
      description: "Preventivni pregled: kočnice, gume, svetla, tahograf kalibracija",
      workshop: "Auto Dijagnostika Zrenjanin",
      invoiceAmount: 550,
      invoiceNumber: "RAC-2025-06001",
      nextServiceKm: 540000,
      nextServiceDate: future(275),
    },
  ];

  for (const s of serviceRecords) {
    const vehicle = createdVehicles[s.vehicleIdx];
    if (!vehicle) continue;
    const exists = await prisma.serviceRecord.findFirst({
      where: { vehicleId: vehicle.id, description: s.description },
    });
    if (!exists) {
      await prisma.serviceRecord.create({
        data: {
          vehicleId: vehicle.id,
          type: s.type,
          sentAt: s.sentAt,
          completedAt: s.completedAt ?? undefined,
          description: s.description,
          workshop: s.workshop,
          invoiceAmount: s.invoiceAmount as unknown as never ?? undefined,
          invoiceNumber: s.invoiceNumber ?? undefined,
          nextServiceKm: s.nextServiceKm ?? undefined,
          nextServiceDate: s.nextServiceDate,
        },
      });
    }
  }
  console.log("Servisni zapisi kreirani.");

  // ── Unosi goriva
  const fuelEntries = [
    { vehicleIdx: 0, date: past(5),  odometer: 574200, delta: 820, liters: 280, pricePerL: 1.82, location: "OMV Beograd — Autoput" },
    { vehicleIdx: 0, date: past(12), odometer: 573380, delta: 750, liters: 255, pricePerL: 1.80, location: "NIS Petrol Niš" },
    { vehicleIdx: 1, date: past(4),  odometer: 489500, delta: 900, liters: 315, pricePerL: 1.82, location: "Lukoil Novi Sad" },
    { vehicleIdx: 1, date: past(9),  odometer: 488600, delta: 870, liters: 298, pricePerL: 1.81, location: "OMV Subotica" },
    { vehicleIdx: 2, date: past(6),  odometer: 321000, delta: 680, liters: 231, pricePerL: 1.82, location: "NIS Petrol Niš" },
    { vehicleIdx: 4, date: past(3),  odometer: 87500,  delta: 760, liters: 248, pricePerL: 1.83, location: "Mol Sombor" },
    { vehicleIdx: 5, date: past(7),  odometer: 612000, delta: 810, liters: 285, pricePerL: 1.80, location: "NIS Petrol Zrenjanin" },
  ];

  for (const f of fuelEntries) {
    const vehicle = createdVehicles[f.vehicleIdx];
    if (!vehicle) continue;
    const exists = await prisma.fuelEntry.findFirst({
      where: { vehicleId: vehicle.id, date: f.date, odometerKm: f.odometer },
    });
    if (!exists) {
      await prisma.fuelEntry.create({
        data: {
          vehicleId: vehicle.id,
          date: f.date,
          odometerKm: f.odometer,
          odometerDeltaKm: f.delta,
          fuelLiters: f.liters as unknown as never,
          pricePerLiter: f.pricePerL as unknown as never,
          totalAmount: (f.liters * f.pricePerL).toFixed(2) as unknown as never,
          location: f.location,
          fuelType: "Dizel",
        },
      });
    }
  }
  console.log("Unosi goriva kreirani.");

  // ── Alert rules (pragovi notifikacija)
  const defaultAlertRules = [
    { type: "vehicle_doc_expiry",    name: "Dokumenta vozila",    warningDays: 30, criticalDays: 5 },
    { type: "driver_license_expiry", name: "Vozačka dozvola",     warningDays: 30, criticalDays: 5 },
    { type: "driver_idcard_expiry",  name: "Lična karta vozača",  warningDays: 30, criticalDays: 5 },
    { type: "service_due_date",      name: "Servis po datumu",    warningDays: 30, criticalDays: 7 },
  ];

  for (const rule of defaultAlertRules) {
    const exists = await prisma.alertRule.findFirst({
      where: { organizationId: org.id, type: rule.type },
    });
    if (!exists) {
      await prisma.alertRule.create({
        data: { organizationId: org.id, ...rule, isActive: true },
      });
    }
  }
  console.log("Alert rules kreirane.");

  // ── Alarmi
  const alertsToCreate = [
    // Narandžasto — osiguranje NS-456-CD ističe za 28 dana
    {
      vehicleId: createdVehicles[1]?.id,
      type: "insurance_expiry",
      level: "warning",
      title: "Osiguranje ističe uskoro",
      message: "Polisa osiguranja za NS-456-CD ističe za 28 dana. Potrebno obnoviti.",
    },
    // Crveno — registracija KG-321-GH ističe za 4 dana
    {
      vehicleId: createdVehicles[3]?.id,
      type: "registration_expiry",
      level: "critical",
      title: "Registracija ističe za 4 dana!",
      message: "Registracija vozila KG-321-GH ističe za 4 dana. Hitno obnoviti.",
    },
    // Tamnocrveno — zeleni karton ZR-987-KL istekao
    {
      vehicleId: createdVehicles[5]?.id,
      type: "green_card_expiry",
      level: "expired",
      title: "Zeleni karton istekao!",
      message: "Zeleni karton za ZR-987-KL je istekao pre 10 dana. Vozilo ne sme izlaziti iz zemlje.",
    },
    // Narandžasto — vozačka dozvola Nikola Jovanović ističe za 22 dana
    {
      driverId: createdDrivers[1]?.id,
      vehicleId: null,
      type: "license_expiry",
      level: "warning",
      title: "Vozačka dozvola ističe uskoro",
      message: "Vozačka dozvola Nikole Jovanovića ističe za 22 dana. Potrebno produžiti.",
    },
    // Tamnocrveno — lična karta Dragana Stojanovića istekla
    {
      driverId: createdDrivers[2]?.id,
      vehicleId: null,
      type: "id_card_expiry",
      level: "expired",
      title: "Lična karta istekla!",
      message: "Lična karta Dragana Stojanovića istekla je pre 5 dana. Potrebno obnoviti.",
    },
  ];

  for (const alert of alertsToCreate) {
    const exists = await prisma.alert.findFirst({
      where: {
        type: alert.type,
        vehicleId: alert.vehicleId ?? undefined,
        driverId: ("driverId" in alert ? alert.driverId : undefined) ?? undefined,
        status: "active",
      },
    });
    if (!exists) {
      await prisma.alert.create({
        data: {
          vehicleId: alert.vehicleId ?? undefined,
          driverId: ("driverId" in alert ? alert.driverId : undefined) ?? undefined,
          type: alert.type,
          level: alert.level,
          title: alert.title,
          message: alert.message,
          status: "active",
        },
      });
    }
  }
  console.log("Alarmi kreirani.");

  // ── Putni nalozi
  const travelOrders = [
    {
      driverIdx: 0,
      vehicleIdx: 0,
      orderNumber: "PN-2025-0041",
      route: "Beograd → Ljubljana → Beograd",
      purpose: "Isporuka robe — klijent Adria d.o.o.",
      departureAt: past(10),
      returnAt: past(8),
      startOdometer: 573000,
      endOdometer: 574800,
      distanceKm: 1800,
      fuelUsed: 620,
      status: "completed",
    },
    {
      driverIdx: 1,
      vehicleIdx: 1,
      orderNumber: "PN-2025-0042",
      route: "Novi Sad → Budimpešta → Novi Sad",
      purpose: "Dostava prehrambenih proizvoda — hladnjača",
      departureAt: past(5),
      returnAt: past(4),
      startOdometer: 488200,
      endOdometer: 489500,
      distanceKm: 1300,
      fuelUsed: 445,
      status: "completed",
    },
    {
      driverIdx: 3,
      vehicleIdx: 4,
      orderNumber: "PN-2025-0043",
      route: "Kragujevac → Beč",
      purpose: "Isporuka auto-delova — klijent VW Österreich",
      departureAt: past(1),
      returnAt: null,
      startOdometer: 87300,
      endOdometer: null,
      distanceKm: null,
      fuelUsed: null,
      status: "approved",
    },
  ];

  for (const t of travelOrders) {
    const driver = createdDrivers[t.driverIdx];
    const vehicle = createdVehicles[t.vehicleIdx];
    if (!driver || !vehicle) continue;
    const exists = await prisma.travelOrder.findFirst({
      where: { organizationId: org.id, orderNumber: t.orderNumber },
    });
    if (!exists) {
      await prisma.travelOrder.create({
        data: {
          organizationId: org.id,
          orderNumber: t.orderNumber,
          driverId: driver.id,
          vehicleId: vehicle.id,
          route: t.route,
          purpose: t.purpose,
          departureAt: t.departureAt,
          returnAt: t.returnAt ?? undefined,
          startOdometer: t.startOdometer,
          endOdometer: t.endOdometer ?? undefined,
          distanceKm: t.distanceKm ?? undefined,
          fuelUsed: t.fuelUsed as unknown as never ?? undefined,
          status: t.status,
        },
      });
    }
  }
  console.log("Putni nalozi kreirani.");

  console.log("\n✅ Seed završen uspešno!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
