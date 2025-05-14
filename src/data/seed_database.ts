import { faker } from "@faker-js/faker";
import { db } from "../db";
import { users, chatRooms, messages } from "../db/schema"; // your drizzle schema
import { eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import quotes from "quotesy";

async function clearDb() {
  await db.delete(messages);
  await db.delete(chatRooms);
  await db.delete(users);
}

async function seedData() {
  const userCount = 10;
  const roomCount = 5;
  const messagesPerRoom = 50;

  const userIds: number[] = [];
  const roomIds: number[] = [];

  // Create users
  for (let i = 0; i < userCount; i++) {
    const sex = faker.helpers.arrayElement(["male", "female"]);
    const firstName = faker.person.firstName(sex);
    const lastName = faker.person.lastName(sex);
    const hashedPassword = await bcrypt.hash("test1234", 10);
    // make sure username is unique
    let username;
    let isUnique = false;
    do {
      username = faker.internet.displayName({ firstName, lastName });
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      isUnique = !existing;
    } while (!isUnique);

    let email;
    isUnique = false;
    do {
      email = faker.internet.email();
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      isUnique = !existing;
    } while (!isUnique);

    const user = await db
      .insert(users)
      .values({
        first_name: firstName,
        last_name: lastName,
        username: username,
        email: email,
        password_hash: hashedPassword,
      })
      .returning({ id: users.id });
    userIds.push(user[0].id);
  }

  // Create rooms
  for (let i = 0; i < roomCount; i++) {
    const room = await db
      .insert(chatRooms)
      .values({
        name: faker.word.words(2),
        description: faker.lorem.sentence(),
      })
      .returning({ id: chatRooms.id });
    roomIds.push(room[0].id);
  }

  // Create messages
  for (const roomId of roomIds) {
    for (let i = 0; i < messagesPerRoom; i++) {
      const senderId = faker.helpers.arrayElement(userIds);
      await db.insert(messages).values({
        roomId,
        senderId,
        message: quotes.random().text,
        created_at: faker.date.recent({ days: 10 }), // last 10 days
      });
    }
  }

  console.log("Seed complete!");
}

if (require.main === module) {
  (async () => {
    try {
      console.log("Clearing database...");
      await clearDb();
      console.log("Seeding database...");
      await seedData();
    } catch (err) {
      console.error("Error during seeding:", err);
      process.exit(1);
    }
  })();
}
