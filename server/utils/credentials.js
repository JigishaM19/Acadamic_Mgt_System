// Generate username: firstname + lastname + year (e.g., siddheshdicholkar2005)
const generateUsername = (firstName, lastName, dob) => {
    const firstPart = firstName.toLowerCase().replace(/\s+/g, '');
    const lastPart = lastName.toLowerCase().replace(/\s+/g, '');
    const year = dob ? new Date(dob).getFullYear().toString() : '2000';
    return firstPart + lastPart + year;
};

// Generate password: firstname + dd + mm + yy (e.g., siddhesh110905)
const generatePassword = (firstName, dob) => {
    const namePart = firstName.toLowerCase().replace(/\s+/g, '');
    if (!dob) {
        return namePart + '010100'; // default if no dob
    }
    const date = new Date(dob);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return namePart + dd + mm + yy;
};

module.exports = { generateUsername, generatePassword };
