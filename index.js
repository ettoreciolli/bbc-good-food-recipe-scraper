var express = require('express');
var apiRouter = require('./routes/api/scrape.js');
var ingredientsRouter = require('./routes/api/ingredients.js');

var app = express();

app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.use('/api/scrape', apiRouter);
app.use('/api/ingredients', ingredientsRouter);

app.get('/', function (req, res) {
	res.send({message: 'Welcome to the BBC Food Recipe Scraper'});
});

app.listen(Number(process.env.PORT), function () {
	console.log('Listening on Port ' + process.env.PORT);
});