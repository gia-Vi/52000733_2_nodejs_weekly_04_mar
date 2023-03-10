const express = require('express')
const bodyParser = require('body-parser')
const hbs = require('hbs')
const request = require('request')
const flash = require('connect-flash')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const { json } = require('express')
const app = express()
const port = 8080

// Bearer token
const authorize = 'Bearer a4cbce9ef1db6d12b1e0c3f26d8532f4bc4cf2633416e444fb0de884f5bbcb41'

app.set('view engine', 'hbs')

function pagination(current, last) {
    var left = current - 2,
        right = current + 3,
        range = [],
        rangeWithDots = [],
        l;

    for (let i = 1; i <= last; i++) {
        if (i == 1 || i == last || i >= left && i < right) {
            range.push(i)
        }
    }

    range.forEach(i => {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1)
            } else if (i - l !== 1) {
                rangeWithDots.push('...')
            }
        }
        rangeWithDots.push(i)
        l = i;
    })

    return rangeWithDots;
}

app.use(cookieParser('secret'))

app.use(session({
    secret: 'secret',
    saveUninitialized: false,
    resave: false
}))

app.use(flash())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
})

app.get('/', (req, res) => {
    let page = req.query.page
    if (!page || isNaN(parseFloat(page)) || parseInt(page) < 1) {
        return res.redirect(301, '/?page=1')
    }

    var options = {
        url: 'https://gorest.co.in/public-api/users?page=' + page + '&per_page=20',
        json: true,
        method: 'GET',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        response = response.body
        if (response.code == 200) {
            let list = ''
            let pageNav = ''
            let totalPage = Math.ceil(response.meta.pagination.pages / 2)
            
            page = parseInt(page)
            if (page > totalPage) {
                return res.redirect(301, '/?page=' + totalPage)
            }

            response.data.forEach(u => {
                list += `<tr data-id="${u.id}"><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.gender}</td><td>${u.status}</td> <td><a href="/users/edit/${u.id}">Chỉnh sửa</a> | <a href="#" onclick="showDeleteModal(event)" data-toggle="modal" data-target="#deleteModal">Xóa</a></td></tr>`
            })
            if (page == 1) {
                pageNav += `<li class="page-item disabled"><a class="page-link" href="/?page=${page-1}">Previous</a></li>`
            } else {
                pageNav += `<li class="page-item"><a class="page-link" href="/?page=${page-1}">Previous</a></li>`
            }
            pagination(page, totalPage).forEach(i => {
                if (i == page) {
                    pageNav += `<li class="page-item active"><a class="page-link" href="/?page=${i}">${i}</a></li>`
                } else if (i == '...') {
                    pageNav += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`
                } else {
                    pageNav += `<li class="page-item"><a class="page-link" href="/?page=${i}">${i}</a></li>`
                }
            })

            if (page == totalPage) {
                pageNav += `<li class="page-item disabled"><a class="page-link" href="/?page=${page+1}">Next</a></li>`
            } else {
                pageNav += `<li class="page-item"><a class="page-link" href="/?page=${page+1}">Next</a></li>`
            }
            res.render('home', { title: 'Home', list: list, page: pageNav, toast: req.flash('toast') })
        }
    })
})

app.get('/users/add', (req, res) => {
    res.render('add', { title: 'Add', data: req.flash('data')[0], errorName: req.flash('errorName'), errorEmail: req.flash('errorEmail'), errorGender: req.flash('errorGender'), errorStatus: req.flash('errorStatus') })
})

app.post('/users/add', (req, res) => {
    var options = {
        url: 'https://gorest.co.in/public-api/users/',
        body: req.body,
        json: true,
        method: 'POST',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        response = response.body
        if (response.code != 201) {
            response.data.forEach(err => {
                switch (err.field) {
                    case 'name':
                        req.flash('errorName', err.message)
                        break
                    case 'email':
                        req.flash('errorEmail', err.message)
                        break
                    case 'gender':
                        req.flash('errorGender', err.message)
                        break
                    case 'status':
                        req.flash('errorStatus', err.message)
                        break
                    default:
                        break
                }
            })
            req.flash('data', options.body)
            res.redirect(301, '/users/add')
        } else {
            if (error) {
                req.flash('toast', [false, 'Thêm người dùng thất bại'])
            } else {
                req.flash('toast', [true, 'Thêm người dùng thành công'])
            }
            res.redirect(301, '/?page=1')
        }
    })
})

app.get('/users/:id', (req, res) => {
    var options = {
        url: 'https://gorest.co.in/public-api/users/' + req.params.id,
        json: true,
        method: 'GET',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        response = response.body
        if (response.code != 200) {
            res.render('detail', { title: 'Detail', detail: `<h2 class="col-12">Người dùng không tồn tại</h2>` })
        } else {
            res.render('detail', { title: 'Detail', detail: `<p class="col-12">ID: ${response.data.id}<br>Tên: ${response.data.name}<br>Email: ${response.data.email}<br>Giới tính: ${response.data.gender}<br>Trạng thái: ${response.data.status}</p>` })
        }
    })
})

app.get('/users/edit/:id', (req, res) => {
    var options = {
        url: 'https://gorest.co.in/public-api/users/' + req.params.id,
        json: true,
        method: 'GET',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        response = response.body
        if (response.code != 200) {
            res.redirect(301, '/?page=1')
        } else {
            res.render('edit', { title: 'Edit', data: response.data, errorName: req.flash('errorName'), errorEmail: req.flash('errorEmail'), errorGender: req.flash('errorGender'), errorStatus: req.flash('errorStatus') })
        }
    })
})

app.post('/users/edit/:id', (req, res) => {
    var options = {
        url: 'https://gorest.co.in/public-api/users/' + req.params.id,
        body: req.body,
        json: true,
        method: 'PUT',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        response = response.body
        if (response.code != 200) {
            response.data.forEach(err => {
                switch (err.field) {
                    case 'name':
                        req.flash('errorName', err.message)
                        break
                    case 'email':
                        req.flash('errorEmail', err.message)
                        break
                    case 'gender':
                        req.flash('errorGender', err.message)
                        break
                    case 'status':
                        req.flash('errorStatus', err.message)
                        break
                    default:
                        break
                }
            })
            req.flash('data', options.body)
            res.redirect(301, '/users/add')
        } else {
            if (error) {
                req.flash('toast', [false, 'Sửa thông tin người dùng thất bại'])
            } else {
                req.flash('toast', [true, 'Sửa thông tin người dùng thành công'])
            }
            res.redirect(301, '/?page=1')
        }
    })
})

app.post('/users/delete/:id', (req, res) => {
    var options = {
        url: 'https://gorest.co.in/public-api/users/' + req.params.id,
        method: 'DELETE',
        headers: {
            'Authorization': authorize
        }
    }
    request(options, function (error, response) {
        if (error) {
            req.flash('toast', [false, 'Xóa người dùng thất bại'])
        } else {
            req.flash('toast', [true, 'Xóa người dùng thành công'])
        }
        res.redirect(301, '/?page=1')
    })
})

app.use((req, res) => {
    res.type('text/plain')
    res.status(404)
    res.send('404 - Not Found')
})

app.use((err, req, res, next) => {
    console.error(err.message)
    res.type('text/plain')
    res.status(500)
    res.send('500 - Server Error')
})

app.listen(port, () => console.log(`Server running at http://localhost:${port}` + '; Press Ctrl + C to stop.'))