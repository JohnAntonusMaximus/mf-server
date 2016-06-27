var express = require('express');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var Post = require('./models/post');
var Category = require('./models/category');
var bodyParser = require('body-parser');
var PORT = process.env.PORT || 3000;
var dbprod = 'mongodb://heroku_bq9nn44b:946ef6090n08ttibbdr5beolmd@ds025263.mlab.com:25263/heroku_bq9nn44b';
var db = dbprod || 'localhost:27017/machforce-db';
var mongodb = require('mongodb');
var mustache = require('mustache-express');
var session = require('express-session');
var multer = require('multer');
var upload = multer({dest: './public/images/'});
var moment = require('moment');
var expressValidator = require('express-validator');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var helpers = require('./helpers');
var async = require('async');



/********************************[Middleware]**************************************** */
// Db Middleware
mongoose.connect(db);

app.use(function(req,res,next){
    req.db = db;
    next();
})

// Default View Path
app.set('views', path.join(__dirname,'/public'));

// Additional Middleware


app.engine('html', mustache());
app.set('view engine', 'html');
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(logger('dev'));
app.use(methodOverride());


// Connect flash
app.use(require('connect-flash')());
app.use(function(req,res,next){
    res.locals.message = require('express-messages')(req,res);
    next();
});

// Express Validator
app.use(expressValidator({
    errorFormatter: function(param,msg,value){
        var namespace = param.split('.')
        , root = namespace.shift()
        , formParam = root;

        while(namespace.length){
            formParam += '[' +namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };

    }
}));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));



/********************************[Front End Routes]*****************************************************/

app.get('/', function(req, res) {
    Post.find({},function(err, posts){
        if (err){
           res.status(400).send();
        } else {
            res.render('index',{posts: posts, dateFormat: moment(posts.date).format("MMM YYYY"), dateFormat2: moment(posts.date).format("MMMM Do YYYY"), day: moment(posts.date).format("D"), image: posts.image});
        }
    });
});

app.get('/index.html', function(req, res) {
    Post.find({},function(err, posts){
        if (err){
           res.status(400).send();
        } else {
            res.render('index',{posts: posts, dateFormat: moment(posts.date).format("MMM YYYY"), dateFormat2: moment(posts.date).format("MMMM Do YYYY"), day: moment(posts.date).format("D"), image: posts.image});
        }
    });
});

app.get('/login.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/login.html'));
});

app.get('/sales-associate.html', function(req, res) {

    Post.find({},function(err, posts){
        if (err){
           res.status(400).send();
        } else {
          console.log(posts[0].body);
            res.render('sales-associate',{posts: posts, dateFormat: moment(posts.date).format("MMM YYYY"), day: moment(posts.date).format("D"), image: posts.image});
        }
    });
});


app.get('/local-sales-network.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/local-sales-network.html'));
});


app.get('/sales-representative/:url', function(req, res){
    Post.findOne({
        url: req.params.url
    }, function(err,post){
        if(err){
            res.send(err);
        }
        res.render('sales-representative', { body: post.body, title: post.title, tags: post.tags, image: post.image, dateFormat: moment(post.date).format("MMM YYYY"), day: moment(post.date).format("D") });
    });
});
      

app.get('/faqs.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/faqs.html'));
});

/********************************[User Admin Routes]*****************************************************/

app.get('/admin/index.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/admin/index.html'));
});

app.get('/admin/leadbuilder-person-email.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/admin/leadbuilder-person-email.html'));
});

app.get('/admin/leadbuilder-person-phone.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/admin/leadbuilder-person-phone.html'));
});

app.get('/admin/leadbuilder-company.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/admin/leadbuilder-company.html'));
});

/********************************[Administrator Backend Routes]*****************************************************/

app.get('/backend/index.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/backend/index.html'));
});

app.get('/backend/posts.html', function(req, res) {
    res.render('backend/posts',{messages: req.flash('success')});
});

app.post('/backend/add-category.html', upload.single('mainimage'), function(req, res) {

    var category = req.body.category;
    console.log(req.body.category);

    if(!category){
       console.log('Category name is missing...');
        req.flash('success','Something was missing...');
        res.location('add-category.html');
        res.redirect('add-category.html');
    } else {
        var newCategory = new Category({
            "name": category
        });

        console.log(category);

        newCategory.save(function(err,result){
            if (err){
                res.send(err);
            } else {
                req.flash('success', 'Category Successfully Added!');
                res.location('posts.html');
                res.redirect('posts.html');
            }
        });
    }

});

app.get('/backend/add-category.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/backend/add-category.html'));
});


app.post('/backend/add-post.html', upload.single('mainimage') , function(req, res) {

    var title = req.body.title;
    var url = req.body.url;
    var category = req.body.category;
    var body = req.body.body;
    var tags = req.body.tags;
    var likes = req.body.likes;
    var views = req.body.views;
    var date = new Date();


    if(req.file){
        var mainImage = req.file.filename;
    } else {
        var mainImage = 'noimage.jpg';
    }

    if (req.body.draft == 'on'){
        var hidden = true;
    } else {
        var hidden = false;
    }

   // Validation
   if(!title || !url || !category || !body || !tags || !likes || !views || mainImage === 'noimage.jpg'){
       console.log('Something was missing...');
        req.flash('success','Something was missing...');
        res.location('add-post.html');
        res.redirect('add-post.html');
   } else if(isNaN(likes) || isNaN(views)){
        console.log('Views and likes are wrong input type...');
        res.location('add-post.html');
        res.redirect('add-post.html');
   } else {

    var post = new Post ({
            "title"    : title,
            "url"      : url,
            "category" : category,
            "image"    : mainImage,
            "body"     : body,
            "tags"     : tags,
            "date"     : date,
            "likes"    : likes,
            "views"    : views,
            "hidden"   : hidden
        });

        post.save(function (err, post){
            if(err){
                res.send(err);
            } else {
                req.flash('success','Post Successfully Added!');
                res.location('posts.html');
                res.redirect('posts.html');
            }
        });
    }
});

app.get('/backend/add-post.html', function(req, res) {

    Category.find({},function(err,categories){
        if(err){
            res.send(err);
        } else {
            res.render('backend/add-post', {categories: categories});
        }

    });
});


/********************************[Server Start]*****************************************************/
console.log("Listening on Port " + PORT + "...")
app.listen(PORT);