class UsernameGenerator {
    constructor() {
        this.commonNames = [
            'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'robert', 'emma',
            'admin', 'user', 'test', 'guest', 'root', 'system', 'administrator'
        ];
        
        this.departments = [
            'it', 'hr', 'finance', 'marketing', 'sales', 'support', 'dev', 'ops',
            'admin', 'system', 'security', 'network', 'database', 'web', 'mobile'
        ];
        
        this.roles = [
            'admin', 'user', 'manager', 'supervisor', 'director', 'head', 'lead',
            'senior', 'junior', 'intern', 'trainee', 'consultant', 'analyst'
        ];
    }

    // Generate username berdasarkan nama
    generateNameBasedUsernames() {
        const usernames = new Set();
        
        this.commonNames.forEach(name => {
            // Nama asli
            usernames.add(name);
            
            // Nama + angka
            for (let i = 0; i < 100; i++) {
                usernames.add(`${name}${i}`);
            }
            
            // Nama + departemen
            this.departments.forEach(dept => {
                usernames.add(`${name}.${dept}`);
                usernames.add(`${dept}.${name}`);
            });
            
            // Nama + role
            this.roles.forEach(role => {
                usernames.add(`${name}.${role}`);
                usernames.add(`${role}.${name}`);
            });
        });
        
        return Array.from(usernames);
    }

    // Generate username berdasarkan departemen
    generateDepartmentBasedUsernames() {
        const usernames = new Set();
        
        this.departments.forEach(dept => {
            // Departemen + angka
            for (let i = 0; i < 100; i++) {
                usernames.add(`${dept}${i}`);
            }
            
            // Departemen + role
            this.roles.forEach(role => {
                usernames.add(`${dept}.${role}`);
                usernames.add(`${role}.${dept}`);
            });
        });
        
        return Array.from(usernames);
    }

    // Generate username berdasarkan role
    generateRoleBasedUsernames() {
        const usernames = new Set();
        
        this.roles.forEach(role => {
            // Role + angka
            for (let i = 0; i < 100; i++) {
                usernames.add(`${role}${i}`);
            }
            
            // Role + departemen
            this.departments.forEach(dept => {
                usernames.add(`${role}.${dept}`);
                usernames.add(`${dept}.${role}`);
            });
        });
        
        return Array.from(usernames);
    }

    // Generate semua username
    generateAllUsernames() {
        const allUsernames = new Set();
        
        // Gabungkan semua metode
        [
            ...this.generateNameBasedUsernames(),
            ...this.generateDepartmentBasedUsernames(),
            ...this.generateRoleBasedUsernames()
        ].forEach(username => allUsernames.add(username));
        
        return Array.from(allUsernames);
    }
}

module.exports = UsernameGenerator; 