using System;
using System.Data.SqlClient;

public class DatabaseHandler {
    private string connectionString = "Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=superSecretPassword123;"; // EXPOSED PASSWORD!
    private const string AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"; // SNEAKY CLOUD SECRET
    private const string STORAGE_KEY = "DefaultEndpointsProtocol=https;AccountName=myAccount;AccountKey=abcde12345/abcdefg+hijk/lmnop==;EndpointSuffix=core.windows.net";

    public void GetUser(string username) {
        string query = $"SELECT * FROM Users WHERE Username = '{username}'"; // SQL INJECTION!
        
        using (SqlConnection connection = new SqlConnection(connectionString)) {
            SqlCommand command = new SqlCommand(query, connection);
            // ... execute command
        }
    }
}
