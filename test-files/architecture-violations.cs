using System;
using System.Data.SqlClient;

namespace MyApp.Domain.Entities {
    /**
     * 🚩 ARCHITECTURE VIOLATION: Layer Boundary & DDD
     * Domain entities should NOT contain infrastructure concerns like SQL connection strings 
     * or direct database access.
     */
    public class UserEntity {
        public int Id { get; set; }
        public string Name { get; set; }

        private string _connStr = "Server=myServer;Database=myData;User Id=myUser;Password=myPassword;";

        public void SaveToDb() {
            using (var conn = new SqlConnection(_connStr)) {
                conn.Open();
                // Direct DB write from an Entity!
            }
        }
    }
}

namespace MyApp.Application.Commands {
    /**
     * 🚩 ARCHITECTURE VIOLATION: CQRS
     * Commands should be "fire and forget" or return a simple ID/status.
     * Returning a full complex object breaks CQRS principles.
     */
    public class CreateUserCommand {
        public UserEntity Execute(string name) {
            var user = new UserEntity { Name = name };
            user.SaveToDb();
            return user; // Returning full entity from a command!
        }
    }
}

namespace MyApp.Web.Controllers {
    /**
     * 🚩 ARCHITECTURE VIOLATION: Naming Convention
     * This file is in a Controllers folder but doesn't end with 'Controller'.
     */
    public class UserHandler {
        public void HandleRequest() {
            // Direct call to Domain Entity instead of using an Application Service
            var entity = new MyApp.Domain.Entities.UserEntity();
            entity.SaveToDb();
        }
    }
}
