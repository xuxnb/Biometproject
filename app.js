const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Set up database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Milestones table
    db.run(`CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
    
    // Materials table
    db.run(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL,
      quantity INTEGER,
      unit TEXT,
      status TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
    
    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      file_path TEXT,
      status TEXT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
    
    // Team members table
    db.run(`CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
    
    // Manufacturing plans table
    db.run(`CREATE TABLE IF NOT EXISTS manufacturing_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
  });
}

// Configure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Routes
app.get('/', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY created_at DESC', [], (err, projects) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.render('index', { projects });
  });
});

// Project routes
app.get('/projects/new', (req, res) => {
  res.render('projects/new');
});

app.post('/projects', (req, res) => {
  const { name, description, start_date, end_date, status } = req.body;
  const sql = `INSERT INTO projects (name, description, start_date, end_date, status)
               VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [name, description, start_date, end_date, status], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect('/');
  });
});

app.get('/projects/:id', (req, res) => {
  const projectId = req.params.id;
  
  // Get project details
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    if (!project) {
      return res.status(404).send('Project not found');
    }
    
    // Get milestones
    db.all('SELECT * FROM milestones WHERE project_id = ?', [projectId], (err, milestones) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error');
      }
      
      // Get materials
      db.all('SELECT * FROM materials WHERE project_id = ?', [projectId], (err, materials) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Database error');
        }
        
        // Get documents
        db.all('SELECT * FROM documents WHERE project_id = ?', [projectId], (err, documents) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send('Database error');
          }
          
          // Get team members
          db.all('SELECT * FROM team_members WHERE project_id = ?', [projectId], (err, teamMembers) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send('Database error');
            }
            
            // Get manufacturing plans
            db.all('SELECT * FROM manufacturing_plans WHERE project_id = ?', [projectId], (err, manufacturingPlans) => {
              if (err) {
                console.error(err.message);
                return res.status(500).send('Database error');
              }
              
              res.render('projects/show', {
                project,
                milestones,
                materials,
                documents,
                teamMembers,
                manufacturingPlans
              });
            });
          });
        });
      });
    });
  });
});

// Milestone routes
app.post('/projects/:id/milestones', (req, res) => {
  const projectId = req.params.id;
  const { title, description, due_date, status } = req.body;
  
  const sql = `INSERT INTO milestones (project_id, title, description, due_date, status)
               VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [projectId, title, description, due_date, status], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect(`/projects/${projectId}`);
  });
});

// Material routes
app.post('/projects/:id/materials', (req, res) => {
  const projectId = req.params.id;
  const { name, quantity, unit, status } = req.body;
  
  const sql = `INSERT INTO materials (project_id, name, quantity, unit, status)
               VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [projectId, name, quantity, unit, status], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect(`/projects/${projectId}`);
  });
});

// Document routes
app.post('/projects/:id/documents', upload.single('document'), (req, res) => {
  const projectId = req.params.id;
  const { title, status } = req.body;
  const filePath = req.file ? req.file.path : null;
  
  const sql = `INSERT INTO documents (project_id, title, file_path, status)
               VALUES (?, ?, ?, ?)`;
  db.run(sql, [projectId, title, filePath, status], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect(`/projects/${projectId}`);
  });
});

// Team member routes
app.post('/projects/:id/team-members', (req, res) => {
  const projectId = req.params.id;
  const { name, role, email } = req.body;
  
  const sql = `INSERT INTO team_members (project_id, name, role, email)
               VALUES (?, ?, ?, ?)`;
  db.run(sql, [projectId, name, role, email], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect(`/projects/${projectId}`);
  });
});

// Manufacturing plan routes
app.post('/projects/:id/manufacturing-plans', (req, res) => {
  const projectId = req.params.id;
  const { title, description, start_date, end_date, status } = req.body;
  
  const sql = `INSERT INTO manufacturing_plans (project_id, title, description, start_date, end_date, status)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [projectId, title, description, start_date, end_date, status], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    res.redirect(`/projects/${projectId}`);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
}); 