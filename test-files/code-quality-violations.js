/**
 * 🚩 VIOLATION: ARROW CODE (Deeply Nested Ifs)
 * This should use Guard Clauses (Early Returns).
 */
function ProcessPayment(user, amount) {
    if (user != null) {
        if (user.IsActive) {
            if (amount > 0) {
                if (user.Balance >= amount) {
                    ChargeUser(user, amount);
                    console.log("Payment successful");
                } else {
                    console.log("Insufficient balance");
                }
            } else {
                console.log("Invalid amount");
            }
        } else {
            console.log("User inactive");
        }
    } else {
        console.log("User not found");
    }
}

/**
 * 🚩 VIOLATION: IF-ELSE CHAIN
 * This should be a switch statement or a map.
 */
function GetUserRole(roleId) {
    let roleName = "";
    if (roleId === 1) {
        roleName = "Admin";
    } else if (roleId === 2) {
        roleName = "Editor";
    } else if (roleId === 3) {
        roleName = "Viewer";
    } else if (roleId === 4) {
        roleName = "Guest";
    } else {
        roleName = "Unknown";
    }
    return roleName;
}

/**
 * 🚩 VIOLATION: DRY (Code Duplication)
 * The tax calculation is repeated instead of being a reusable function.
 */
function CalculateInvoiceTotal(price, quantity) {
    const subtotal = price * quantity;
    const tax = subtotal * 0.15; // Repeated logic
    return subtotal + tax;
}

function CalculateRefund(price, quantity) {
    const subtotal = price * quantity;
    const tax = subtotal * 0.15; // Repeated logic
    return subtotal + tax;
}

/**
 * 🚩 VIOLATION: OOP Principles
 * Procedural code passing too many related primitives.
 */
function CreateProfile(firstName, lastName, age, email, phone, address, city, zip) {
    // This should probably take a 'User' object or a 'ProfileData' DTO.
    console.log(`Creating profile for ${firstName} ${lastName}`);
}
