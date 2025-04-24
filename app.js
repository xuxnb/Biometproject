const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');

// Setup logging
const logFile = fs.createWriteStream('./app.log', {flags: 'a'});
function log(level, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  const logString = JSON.stringify(logEntry);
  console.log(logString);
  logFile.write(logString + '\n');
}

// Error logger
function logError(message, error) {
  log('ERROR', message, {
    error: error.message,
    stack: error.stack
  });
}

// 数据库查询辅助函数
function safeQuery(query, params, callback) {
  try {
    db.all(query, params, (err, rows) => {
      if (err) {
        logError(`Error executing query: ${query}`, err);
        callback(err, null);
      } else {
        callback(null, rows);
      }
    });
  } catch (error) {
    logError(`Exception in query: ${query}`, error);
    callback(error, null);
  }
}

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Set up database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    
    // Force synchronous execution to catch any schema errors
    db.serialize(() => {
      try {
        // Enable foreign keys - Must be run EACH TIME a connection is made
        db.run('PRAGMA foreign_keys = ON;', function(err) {
          if (err) {
            console.error('Error enabling foreign keys:', err.message);
          } else {
            console.log('Foreign keys enabled');
            
            // Check if foreign keys are really enabled
            db.get('PRAGMA foreign_keys;', [], (err, result) => {
              if (err) {
                console.error('Error checking foreign keys:', err.message);
              } else {
                console.log('Foreign keys status:', result);
              }
            });
          }
        });
        
        // Check database structure
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
          if (err) {
            console.error('Error getting tables:', err.message);
          } else {
            console.log('Database tables:', tables.map(t => t.name).join(', '));
          }
        });
        
        // Initialize database
        initializeDatabase();
      } catch (error) {
        console.error('Database initialization error:', error);
      }
    });
  }
});

// Initialize database tables
function initializeDatabase() {
  console.log('Initializing database tables...');
  
  db.serialize(() => {
    try {
      // Projects table
      db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT,
        cover_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, function(err) {
        if (err) {
          console.error('Error creating projects table:', err.message);
        } else {
          console.log('Projects table ready');
        }
      });
      
      // Milestones table
      db.run(`CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        status TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`, function(err) {
        if (err) {
          console.error('Error creating milestones table:', err.message);
        } else {
          console.log('Milestones table ready');
        }
      });
      
      // Materials table
      db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT NOT NULL,
        quantity INTEGER,
        unit TEXT,
        status TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`, function(err) {
        if (err) {
          console.error('Error creating materials table:', err.message);
        } else {
          console.log('Materials table ready');
        }
      });
      
      // Documents table
      db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        file_path TEXT,
        status TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`, function(err) {
        if (err) {
          console.error('Error creating documents table:', err.message);
        } else {
          console.log('Documents table ready');
        }
      });
      
      // Team members table
      db.run(`CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`, function(err) {
        if (err) {
          console.error('Error creating team_members table:', err.message);
        } else {
          console.log('Team members table ready');
        }
      });
      
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
      )`, function(err) {
        if (err) {
          console.error('Error creating manufacturing_plans table:', err.message);
        } else {
          console.log('Manufacturing plans table ready');
        }
      });
    } catch (error) {
      console.error('Error in database initialization:', error);
    }
  });
}

// Configure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Make sure the uploads directory exists
    if (!fs.existsSync('./uploads')) {
      try {
        fs.mkdirSync('./uploads', { recursive: true });
        log('INFO', 'Created uploads directory');
      } catch (error) {
        logError('Failed to create uploads directory', error);
        return cb(new Error('无法创建上传目录'));
      }
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Sanitize the filename to avoid special characters
    const fileExtension = path.extname(file.originalname);
    const safeName = Date.now() + '-' + Math.random().toString(36).substring(2, 15) + fileExtension;
    log('DEBUG', 'Generated safe filename', { original: file.originalname, safe: safeName });
    cb(null, safeName);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    log('WARN', 'Invalid file type rejected', { mimetype: file.mimetype });
    cb(new Error('只允许上传JPG、PNG、GIF或WEBP格式的图片文件'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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
app.use(methodOverride('_method'));

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

app.post('/projects', upload.single('cover_image'), (req, res) => {
  try {
    const { name, description, start_date, end_date, status } = req.body;
    
    if (!name) {
      log('WARN', 'Project creation failed: Name is required', { body: req.body });
      return res.status(400).send('项目名称不能为空');
    }
    
    log('INFO', 'Creating new project', { body: req.body, file: req.file ? req.file.filename : null });
    
    const cover_image = req.file ? `/uploads/${req.file.filename}` : null;
    
    const sql = `INSERT INTO projects (name, description, start_date, end_date, status, cover_image)
                VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [name, description, start_date, end_date, status, cover_image];
    log('DEBUG', 'SQL Insert', { sql, params });
    
    db.run(sql, params, function(err) {
      if (err) {
        logError('Error creating project', err);
        return res.status(500).send('数据库插入错误: ' + err.message);
      }
      log('INFO', 'Project created successfully', { id: this.lastID });
      res.redirect('/');
    });
  } catch (error) {
    logError('Exception during project creation', error);
    return res.status(500).send('处理错误: ' + error.message);
  }
});

// Project details route with improved error handling
app.get('/projects/:id', (req, res, next) => {
  const projectId = req.params.id;
  
  log('INFO', 'Getting project details', { id: projectId });
  
  // Validate project ID is a number
  if (isNaN(parseInt(projectId))) {
    return res.status(400).render('error', {
      statusCode: 400,
      message: '无效的项目ID',
      details: `"${projectId}" 不是有效的ID格式`
    });
  }
  
  // Use async series pattern to simplify nested callbacks
  async function getProjectData() {
    try {
      // Get project details
      const project = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!project) {
        log('WARN', 'Project not found', { id: projectId });
        return res.status(404).render('error', {
          statusCode: 404,
          message: '项目未找到',
          details: `ID为 ${projectId} 的项目不存在或已被删除`
        });
      }
      
      // Get all related data in parallel
      const [milestones, materials, documents, teamMembers, manufacturingPlans] = await Promise.all([
        // Get milestones
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM milestones WHERE project_id = ?', [projectId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        // Get materials
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM materials WHERE project_id = ?', [projectId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        // Get documents
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM documents WHERE project_id = ?', [projectId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        // Get team members
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM team_members WHERE project_id = ?', [projectId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        // Get manufacturing plans
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM manufacturing_plans WHERE project_id = ?', [projectId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        })
      ]);
      
      log('DEBUG', 'Successfully fetched project details', { 
        id: projectId, 
        hasMilestones: milestones.length > 0, 
        hasMaterials: materials.length > 0,
        hasDocuments: documents.length > 0,
        hasTeam: teamMembers.length > 0,
        hasPlans: manufacturingPlans.length > 0
      });
      
      // Render the view with all data
      res.render('projects/show', {
        project,
        milestones,
        materials,
        documents,
        teamMembers,
        manufacturingPlans
      });
      
    } catch (error) {
      // Forward any errors to the global error handler
      logError(`Error processing project ${projectId}`, error);
      next(error);
    }
  }
  
  // Execute the async function
  getProjectData();
});

// Update project - changed to standard endpoint
app.post('/projects/:id', upload.single('cover_image'), (req, res) => {
  const projectId = req.params.id;
  const { name, description, start_date, end_date, status } = req.body;
  
  log('INFO', 'Updating project', { id: projectId, body: req.body, file: req.file ? req.file.filename : null });
  
  // If there's a new file, use it, otherwise keep the existing cover_image
  let cover_image = null;
  let params = [];
  let sqlUpdate = '';
  
  // First get the current project to check if there's an existing cover_image
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      logError('Error getting project', err);
      return res.status(500).send('数据库错误: ' + err.message);
    }
    
    if (!project) {
      log('WARN', 'Project not found', { id: projectId });
      return res.status(404).send('项目未找到');
    }
    
    log('DEBUG', 'Existing project', { project });
    
    try {
      if (req.file) {
        // New file uploaded, update cover_image
        cover_image = `/uploads/${req.file.filename}`;
        sqlUpdate = `UPDATE projects 
                    SET name = ?, description = ?, start_date = ?, end_date = ?, status = ?, cover_image = ? 
                    WHERE id = ?`;
        params = [name, description, start_date, end_date, status, cover_image, projectId];
      } else {
        // No new file, keep existing cover_image
        sqlUpdate = `UPDATE projects 
                    SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? 
                    WHERE id = ?`;
        params = [name, description, start_date, end_date, status, projectId];
      }
      
      log('DEBUG', 'SQL Update', { sql: sqlUpdate, params });
      
      db.run(sqlUpdate, params, function(err) {
        if (err) {
          logError('Error updating project', err);
          return res.status(500).send('数据库更新错误: ' + err.message);
        }
        log('INFO', 'Project updated successfully', { id: projectId });
        res.redirect(`/projects/${projectId}`);
      });
    } catch (error) {
      logError('Exception during update', error);
      return res.status(500).send('处理错误: ' + error.message);
    }
  });
});

// Keep the original route to maintain backward compatibility
app.post('/projects/:id/update', upload.single('cover_image'), (req, res) => {
  const projectId = req.params.id;
  res.redirect(307, `/projects/${projectId}`); // 307 preserves method and body
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

// Global error handler
app.use((err, req, res, next) => {
  logError('Unhandled application error', err);
  
  // 提供更好的错误消息
  let statusCode = 500;
  let errorMessage = '服务器内部错误';
  let errorDetails = err.stack;
  
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = '文件过大，请上传较小的文件';
    } else {
      errorMessage = '文件上传错误: ' + err.message;
    }
  }
  
  // 渲染错误页面
  res.status(statusCode).render('error', {
    statusCode: statusCode,
    message: errorMessage,
    details: errorDetails
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logFile.end();
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});

// 添加404错误处理
app.use((req, res) => {
  log('WARN', '404 Not Found', { url: req.originalUrl });
  res.status(404).render('error', {
    statusCode: 404,
    message: '页面未找到 - 请确认地址是否正确',
    details: `找不到路径: ${req.originalUrl}`
  });
}); 