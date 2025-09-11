const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../database/meduco.db');
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to SQLite database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database successfully');
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                            console.error('Error enabling foreign keys:', err.message);
                        }
                    });
                    resolve(this.db);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }

    // Helper method to run queries with promises
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Helper method to get single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Helper method to get all rows
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Helper method for transactions
    async transaction(operations) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                Promise.all(operations.map(op => op()))
                    .then(results => {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(results);
                            }
                        });
                    })
                    .catch(error => {
                        this.db.run('ROLLBACK', (rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Rollback error:', rollbackErr);
                            }
                            reject(error);
                        });
                    });
            });
        });
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;