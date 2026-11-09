import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.log("Usage: npm run hash-password <your-password>");
  process.exit(1);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log("\nGenerated Bcrypt Password Hash (store in ADMIN_PASSWORD_HASH in .env):");
console.log(hash);
console.log("");
