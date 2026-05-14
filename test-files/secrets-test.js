/**
 * Test file for advanced secret detection.
 * These are all fake/test values.
 */

const config = {
    // Cloud Keys
    aws_key: "AKIA1234567890EXAMPLE",
    aws_secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    gcp_api: "AIzaSyB1234567890-abcdefghij-klmnopqrs",

    // Databases
    postgres: "postgres://admin:password123@localhost:5432/mydb",
    mongo: "mongodb+srv://user:secretPwd@cluster0.abcde.mongodb.net/test",
    mssql: "Server=myServer;Database=myData;User Id=myUser;Password=myPassword;",

    // SaaS Tokens
    slack: "xoxb-1234567890-1234567890-abcdef1234567890",
    github: "ghp_1234567890abcdefghijklmnopqrstuvwxyz1234",
    stripe: "sk_live_1234567890abcdefghijklmn",

    // Generic
    session_token: "s.abcde12345fghij67890klmno",
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoyNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
};

function connect() {
    const db_url = "postgres://root:very_secret_pass@prod-db.example.com:5432/production";
    console.log("Connecting...");
}
