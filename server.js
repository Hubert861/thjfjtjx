const express = require('express')
const mysql = require('mysql2')
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const SECRET_KEY = '123'
const db = mysql.createPool({
    host: 'sql7.freesqldatabase.com',
    user: 'sql7771606',
    password: 'y9ja2q9bBt',
    database: 'sql7771606',
})

app.post('/register', async (req, res) => {
    const dane = req.body

    const salt = await bcrypt.genSalt(10)
    const hashedHaslo = await bcrypt.hash(dane.haslo, salt)
    let odpowiedz = {
        loginZajety: false,
        emailZajety: false,
    }

        const queryLogin = 'SELECT COUNT(*) AS count FROM users WHERE name = ?'
        const [rowsLogin] = await db.promise().execute(queryLogin, [dane.login])
       

        if(rowsLogin[0].count > 0){
            odpowiedz.loginZajety = true
        }

        const queryEmail = 'SELECT COUNT(*) as count FROM users WHERE email = ?'
        const [rowsEmail] = await db.promise().execute(queryEmail, [dane.email])
        

        if(rowsEmail[0].count > 0){
            odpowiedz.emailZajety = true
        }

        if(!odpowiedz.loginZajety && !odpowiedz.emailZajety){
            const queryRejestracja = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "user")'
            await db.promise().execute(queryRejestracja, [dane.login,  dane.email, hashedHaslo])
        }

    res.json(odpowiedz)
})

app.post('/login', async (req, res)=>{
    const dane1 = req.body

    let odpowiedz = {
        zalogowano: false,
        token: null
    }

        const query1 = 'SELECT * FROM users WHERE name = ?'
        const [rows1] = await db.promise().execute(query1, [dane1.login])

        if(rows1.length > 0){
            const user = rows1[0]

            const pasuje = await bcrypt.compare(dane1.haslo, user.password)

            if(pasuje){
                const token = jwt.sign(
                    {
                        id: user.id,
                        login: user.name,
                        role: user.role,
                        zalogowany: true,
                    },
                    SECRET_KEY, {expiresIn: '7d'}
                )

                odpowiedz = {
                    zalogowano: true,
                    token: token
                }
            }
        } 
    


    res.json(odpowiedz)
})

app.get('/posty', async (req, res) => {
    let limit = parseInt(req.query.limit) || 10;
    let przesuniecie = parseInt(req.query.przesuniecie) || 0;

    await db.promise().execute('SET SESSION group_concat_max_len = 100000')

    const queryPost = `
        SELECT 
            posts.*, 
            users.name AS user_name,
            GROUP_CONCAT(post_photos.image_path) AS image_paths
        FROM posts
        JOIN users ON posts.autor_id = users.id
        LEFT JOIN post_photos ON post_photos.post_id = posts.id
        WHERE posts.status = "Git"
        GROUP BY posts.id, posts.tresc, posts.data_utworzenia, users.name
        ORDER BY posts.id DESC
        LIMIT ? OFFSET ?`;

    db.query(queryPost, [limit, przesuniecie], (err, results) => {
        res.json(results);
    });
});


app.get('/posty2', async (req, res) =>{
    let limit = parseInt(req.query.limit) || 10
    let przesuniecie = parseInt(req.query.przesuniecie) || 0
    
    await db.promise().execute('SET SESSION group_concat_max_len = 100000')

    const queryPost = 
    `SELECT 
        posts.*, 
        users.name AS user_name,
        GROUP_CONCAT(post_photos.image_path) AS image_paths
    FROM posts
    JOIN users ON posts.autor_id = users.id
    LEFT JOIN post_photos ON post_photos.post_id = posts.id
    WHERE posts.status = "NieGit"
    GROUP BY posts.id, posts.tresc, posts.data_utworzenia, users.name
    ORDER BY posts.id ASC
    LIMIT ? OFFSET ?`

    db.query(queryPost, [limit, przesuniecie], (err, results) => {
        res.json(results)
    })
})

app.post('/wyrok', async (req, res) => {
    const daneWyrok = req.body
    const queryWyrok = 'UPDATE posts SET status = ? WHERE id = ?'

    if(daneWyrok.git){
        await db.promise().execute(queryWyrok, ['Git', daneWyrok.id])
    }
    else{
        await db.promise().execute(queryWyrok, ['Odrzucony', daneWyrok.id])
    }
    


        
    res.json({ sukces: true })

})

app.post('/dodaj', async (req, res) => {
    const daneDodaj = req.body
    const queryDodaj = 'INSERT INTO posts (tresc, autor_id, status) VALUES (?, ?, "NieGit")'
    const [wynik] = await db.promise().execute(queryDodaj, [daneDodaj.tresc, daneDodaj.id])

    const postId = wynik.insertId
    

    const queryDodajImg = 'INSERT INTO post_photos (post_id, image_path) VALUES (?, ?)'
    

    for(item of daneDodaj.url){
        await db.promise().execute(queryDodajImg, [postId, item])
    }
    res.json({ sukces: true })

})

app.post('/dodajKom', async (req, res) => {
    const daneDodaj = req.body
    const queryDodaj = 'INSERT INTO comments (user_id, post_id, tresc) VALUES (?, ?, ?)'
    const [wynik] = await db.promise().execute(queryDodaj, [daneDodaj.autor, daneDodaj.idPosta, daneDodaj.tresc])

    
    res.json({ sukces: true })

})


app.get('/komentarze', async (req, res) =>{
    let post = parseInt(req.query.post)

    const queryPost = 
    `SELECT *, users.name 
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE post_id = ?`

    db.query(queryPost, post, (err, results) => {
        res.json(results)
    })
})


app.listen(3000, () => {
    console.log('Serwer działa na porcie 3000')
})
