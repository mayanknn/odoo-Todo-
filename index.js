const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const dotenv = require("dotenv");


dotenv.config(); // Load environment variables from .env file

const twilio = require("twilio");
const TWILIO_SID = "ACd77ab5bff42da4ad598b9cec6958d4b6";
const TWILIO_AUTH_TOKEN = "bd261e073b3313b074b4eb9c146a928d";
const PHONE_NUMBER = "+1 877 899 9516"; // Replace with your Twilio phone number


const app = express();
const connection = mysql.createConnection({
    host: "mysql-521c81a-dodwaniharshil-e79e.f.aivencloud.com",
    user: "avnadmin",
    password: "AVNS_4tCjysG6hqHpp12MksG",
    port:"25875",
    database: "collaboration_todo"
});

connection.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
        return;
    }
    console.log("Connected to database");
});

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/public/FILES"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());



// Register Page - Serve register.html
app.get("/register", (req, res) => {
   
    connection.query("select * from roles",(err,response)=>{
        if(err) return console.log(err);
        res.render(__dirname + "/views/register.ejs",{response});

    })
});

// Register Data - Handle POST request to register a new student
app.post("/registerData", (req, res) => {
    var {roles} = req.body;
    console.log(roles);


    const { name, email, phn, password } = req.body;
    connection.query("INSERT INTO users(username, email, phone_number, password) VALUES (?,  ?, ?, ?)",
        [name, email, phn, password],
        (err, result) => {
            if (err) {
                console.error("Error inserting student:", err);
                return res.status(500).send({ message: 'Error inserting student' });
            }
            console.log("Student registered:", name);
            connection.query(`INSERT INTO user_roles (user_id, role_id)SELECT u.id, r.id FROM users u JOIN roles r ON r.role_name = '${roles}' WHERE u.username = '${name}'`)
            res.redirect("/");
        }
    );
    
});

// Home Page - Serve index.html
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/FILES/index.html");
});

// Home - Handle login POST request
app.post("/home", async (req, res) => {
    const { name, password } = req.body;

    connection.query(
        "SELECT email, password FROM users WHERE email = ? AND password = ?",
        [name, password],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send({ message: 'Database error' });
            }

            if (results.length === 0) {
                console.error("User not found or incorrect password");
                return res.send("User Not Found");
            }

            console.log("User logged in:", results);

            connection.query('UPDATE users SET status = ? WHERE email = ?', ['online', name], (error, updateResults) => {
                if (error) throw error;
                connection.query("select id from users where email = ?",[name],(err,results5)=>{
                    if(err) return console.log(err);;
                    console.log(results5[0]['id']);
                    var adminID = results5[0]['id'];
                    connection.query('SELECT username FROM users', (err, response) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send({ message: 'Database error' });
                        }
    
                        connection.query('SELECT * FROM tasks', (err, response2) => {
                            if (err) {
                                console.log(err);
                                return res.status(500).send({ message: 'Database error' });
                            }
                            // console.log(results[0].id)
                            // Now render the template with both response and response2
                            // console.log(response2)
                            res.render("adminPanel.ejs", { adminID: results5[0].id, response, response2 });
                        });
                    });
                    
                })


                
            });
        }
    );
});

app.get("/sort-title", (req, res) => {
    connection.query("SELECT * FROM tasks ORDER BY title", (err, response) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error"); // Handle error appropriately
        }
        res.render("sortedAdminPanel.ejs", { response }); // Assuming adminPanel.ejs is your template
    });
});
app.get("/sort-due", (req, res) => {
    connection.query("SELECT * FROM tasks ORDER BY due_date", (err, response) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error"); // Handle error appropriately
        }
        res.render("sortedAdminPanel.ejs", { response }); // Assuming adminPanel.ejs is your template
    });
});
app.get("/sort-priority", (req, res) => {
    connection.query("SELECT * FROM tasks ORDER BY FIELD(priority, 'high', 'medium', 'low') ASC", (err, response) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error"); // Handle error appropriately
        }
        res.render("sortedAdminPanel.ejs", { response }); // Assuming sortedAdminPanel.ejs is your template
    });
});


app.get("/update-complete",(req,res)=>{
    var taskId=req.query;
    connection.query("UPDATE tasks set status= ? where id = ?",['completed',taskId],(err,result)=>{
        if(err) return console.log(err);
        res.send("HOOO GYAAA")
    })
})
app.post('/tasks', async (req, res) => {
    const { title, description, due_date, priority, adminId } = req.body;

    try {
        // Insert task into the tasks table
        connection.query(
            'INSERT INTO tasks (title, description, due_date, priority, created_by) VALUES (?, ?, ?, ?, ?)', 
            [title, description, due_date, priority, adminId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Error inserting task');
                }

                const taskId = result.insertId; // Get the inserted task's ID
                console.log(adminId)
                // Insert into task_history table
                connection.query(
                    'INSERT INTO task_history (task_id, changed_by, change_type, change_description) VALUES (?, ?, ?, ?)',
                    [taskId, adminId, 'create', description],
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send('Error inserting task history');
                        }

                        console.log('Data successfully added');
                        res.status(200).send('Task and history successfully added');
                    }
                );
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});
app.get("/loggedin", (req, res) => {
    res.render("adminPanel.ejs"); // Assuming you are rendering an EJS template
});

app.get('/update-task', (req, res) => {
    
});


//OTP SEND 

app.get("/forgetScreen",(req,res)=>{
    res.render("forget.ejs",{faaltu})
})
app.get('/forget', async (req, res) => {
    const { name,phn } = req.query; // Get the name from the query parameter

    async function sendSMS() {
        const client = new twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
        const otp = Math.floor(1000 + Math.random() * 9000);
        try {
            await client.messages.create({
                body: `Your OTP is: ${otp}`,
                from: PHONE_NUMBER,
                to: phn
            });
            console.log('MSG SENT');
            return otp;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    const otp = await sendSMS();
    if (otp !== null) {
         // Pass the name to the template
    } else {
        res.status(500).send('Failed to send OTP');
    }
});


app.get("/deleteTask",(req,res)=>{
    var taskid=req.query;
    console.log(taskid)
    connection.query("delete from tasks where id =?",[taskid.taskid],(err,response)=>{
        if(err) return console.log(err)
        res.send("DONE")
    })
});
// NEW PASSWORD TO DATABASE
app.get("/resetPassword", (req, res) => {
   const { name } = req.query; // Get the name from the query parameter
   const {newPassword} = req.query;
   var query=`update student set password = '${newPassword}' where name = '${name}'`;
   connection.query(query,(err,result)=>{
    if(err) return console.log(err);
    res.sendFile(__dirname + "/public/FILES/index.html");
   })
});



const port = 5000;
app.listen(port, (err) => {
    if (err) {
        console.error("Server startup error:", err);
        return;
    }
    console.log(`Server is running at http://localhost:${port}`);
});








// MAYANK CODE

// const express = require("express"); 
// const bodyParser = require("body-parser"); 
// const mysql = require("mysql2"); 
// const dotenv = require("dotenv"); 
// dotenv.config(); 
// const app = express(); 
// const connection = mysql.createConnection({ 
//     host: "mysql-521c81a-dodwaniharshil-e79e.f.aivencloud.com", 
//     user: "avnadmin", 
//     password: "AVNS_4tCjysG6hqHpp12MksG", 
//     port: 25875, 
//     database: 'collaboration_todo', 
// }); 
 
// connection.connect((err) => { 
//     if (err) { 
//         console.error("Error connecting to database:", err); 
//         return; 
//     } 
//     console.log("Connected to database"); 
// }); 
 
// app.use(express.static(__dirname + "/public")); 
// app.use(express.urlencoded({ extended: false })); 
// app.use(express.json()); 
 

// app.get("/", (req, res) => {
//         res.sendFile(__dirname + "/public/FILES/index.html");
//     });
// // Register Page - Serve register.html 
// app.get("/register", (req, res) => { 
//     res.redirect(__dirname + "/views/register.ejs"); 
// }); 
 
// // Register Data - Handle POST request to register a new student 
// app.post("/registerData", async (req, res) => { 
//     const { username, email, password, phoneno } = req.body; 
//     const username1 = req.body.username1 
 
//     try { 
//         connection.query('INSERT INTO users (username, email, password, phone_number) VALUES (?, ?, ?, ?)',  
//             [username, email, password, phoneno],  
//             (err, result) => { 
//                 if (err) { 
//                     console.error("Error inserting student:", err); 
//                     return res.status(500).send({ message: 'Error inserting student' }); 
//                 } 
//                 console.log("Student registered:", username); 
//                 res.redirect("/"); 
//             } 
//         ); 
//     } catch (err) { 
//         console.error("Error inserting student:", err); 
//         res.status(500).send({ message: 'Error inserting student' }); 
//     } 
// }); 
// app.post("/home", async (req, res) => { 
//         const { name, password } = req.body; 
//         console.log({name,password}) 
//         connection.query( 
//             "SELECT email,password FROM users WHERE email = ? and password = ?",  
//             [name,password], (err, results) => { 
//                 console.log(results); 
//                 if (err) { 
//                     console.error("Database error:", err); 
//                     return res.status(500).send({ message: 'Database error' }); 
//                 } 
//                 if (results.length === 0 ) { 
//                     console.error("User not found or incorrect password"); 
//                     res.send("User Not Found"); 
//                 } 
//                 console.log("User logged in:",results); 
//                 connection.query('UPDATE users SET status = ? WHERE email = ?', ['online', name], (error, results) => { 
//                     if (error) throw error; 
//                     res.render("adminPanel.ejs"); 
                   
//                   }); 
              
               
//             } 
//         ); 
//     }); 


 
// const port = 5000; 
// app.listen(port, (err) => { 
//     if (err) { 
//         console.error("Server startup error:", err); 
//         return; 
//     } 
//     console.log(`Server is running at http://localhost:${port}`); 
// });