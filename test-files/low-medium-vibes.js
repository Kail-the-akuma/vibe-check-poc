/**
 * This file contains Medium and Low severity "vibe" issues.
 * Used to test the VibeCheck dashboard filtering and counters.
 */

// 🟡 MEDIUM: Chain of if-else that should be a switch (Architecture/Quality)
function processStatus(status) {
    if (status === 'pending') {
        return 1;
    } else if (status === 'active') {
        return 2;
    } else if (status === 'suspended') {
        return 3;
    } else if (status === 'deleted') {
        return 4;
    } else if (status === 'archived') {
        return 5;
    } else {
        return 0;
    }
}

// 🔵 LOW: Naming convention (Class name doesn't follow project standard)
class user_data_manager {
    constructor() {
        this.data = [];
    }

    // 🔵 LOW: Missing documentation on complex regex
    validate(input) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
    }
}

// 🟡 MEDIUM: DRY Violation (Repeated logic that should be abstracted)
function calculateTax(amount) {
    const rate = 0.23;
    const result = amount * rate;
    console.log('Calculation complete for tax');
    return result;
}

function calculateDiscount(amount) {
    const rate = 0.10;
    const result = amount * rate;
    console.log('Calculation complete for discount'); // Repeated logging pattern
    return result;
}

// 🔵 LOW: Procedural code instead of using the existing class
const mgr = new user_data_manager();
mgr.data.push({ id: 1, name: 'Hugo' });
console.log(mgr.data);
