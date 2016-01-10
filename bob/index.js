
/**
* @desc Initial script for Bob-Server with routing information
*/

'use strict';

var db = require('./mongoose/db.js');
var models = require('./mongoose/models.js');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();




app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
	next();
});



app.use('/', express.static(__dirname));

//use the extended request body
app.use(bodyParser.urlencoded({
  extended: true
}));



app.get('/', function (req, res) {
  console.log('Got Request!');	
});

// GET /api/einsatz
//   Route um alle Einsätze abzurufen.
app.get('/api/einsatz', function(req, res) {
  db.models.einsaetze.find({}, function(error, values) {
    if (error) {
      var message = "DB error: " + error;
      console.log(message);
      res.status(400).send(message);
    } else {

	  // Hier wird noch ein ziemlich mächtiges JSON übergeben. Eventuell andere Struktur überlegen, wie in Dokumentation beschrieben? *Nico
      res.json(values);
      res.end();
    }
  });
});


// GET /api/einsatz/new
//   Route um einen neuen Einsatz in der Datenbank anzulegen.
//	 Benötigt (valides) JSON nach Notation in der Dokumentation
app.get('/api/einsatz/new', function(req, res) {
  // Einsatz hier validieren?
  var myEinsatz = new db.models.einsaetze({});

  myEinsatz.locked = false;

  myEinsatz.save(function(error) {
    if (error) {
      res.status(400).json({
        status: "Fehler beim Abspeichern des Einsatzes " + req.body.title + ": " + error
      });
    } else {
      res.json(myEinsatz);
      res.end();
    }
  });
});


// POST /api/einsatz/:EinsatzID
//   Route um einen existierenden Einsatz zu editieren.
//	 Nimmt einen neuen Einsatz entgegen und überschreibt den Existenten.
app.post('/api/einsatz/:EinsatzID/', function(req, res) {
  var einsatzid = req.params.EinsatzID;

  db.models.einsaetze.findById(einsatzid, function(err, value) {
    if (err) {
      res.status(400).send(err);
    } else {

      if(value.locked){

	      res.status(400).send("Einsatz ist abgeschlossen (locked)");

      }

      value = req.body;
      // POST-Body = Einsatz JSON
      value.save(function(err) {
        if (err) return handleError(err);
        //res.status(200); //Boost Performance if needed
        res.send(value);
      });
    }
  });
});


// POST /api/einsatz/:EinsatzID/lock
//   Route um einen existierenden Einsatz zu sperren.
//	 Eine weitere Editierung des Einsatzes ist nicht möglich.
app.post('/api/einsatz/:EinsatzID/lock', function(req, res) {

  db.models.einsaetze.update({ _id: req.params.EinsatzID }, { $set: { locked: 'true' }}, function(){

	  res.send("Einsatz mit ID " + req.params.EinsatzID + " wurde gesperrt.");

  });

});


/**
* @desc Update ein Zeichen mit den uebergebenen Informationen
*/
app.post('/zeichen/:id/', function(req, res) {

	var id = req.params.id;
	var query = {id: req.params.id};
	db.models.taktZeichens.update(query, {$set: {Kategorie: req.body.Kategorie, Titel: req.body.Titel, Svg: req.body.Svg}}, function(err) {
		if(err) {
			console.log('Error updating the file: ' + err);
			res.status(500).send('Fehler beim update des Zeichens.');
		};
		res.send(id);
	});
});

/**
* @desc Speichere ein uebergebenes TZ in der DB
*/
app.put('/zeichen/', function(req, res) {

	//erzeuge neues Zeichen, das in der DB abgelegt werden soll.
	var zeichen = new db.models.taktZeichens({
		//id: shortid.generate(); Muss das angegeben werden (wegen default im model?)
		Kategorie: req.body.Kategorie,
		Titel: req.body.Titel,
		Svg: req.body.Svg
	});

	//speichere das Zeichen in der DB
	zeichen.save(function(error) {
		var message = error ? 'failed to save TZ:' + error
							: 'saved TZ:' + zeichen.id;
		console.log(message);
		//und gib die ID an den Client zurück
		res.send('{"id": "' + zeichen.id + '"}'); 
	});
});


/**
* @desc Loescht ein Taktisches Zeichen aus der Datenbank.
* @param :id ID des TZ, das aus der DB geloescht werden soll
*/
app.delete('/zeichen/:id/', function(req, res) {

	var id = req.params.id;
	//durch richtigen Namen für TZ ersetzen
	db.models.taktZeichens.remove({id: id}, function(error) {
		var message = error ? 'failed to remove from DB' + error
							: 'successfully deleted';
		console.log(message);
		res.send(message);
	});
});

/* liefert alle taktischen zeichen inkl. Attribute */
app.get('/zeichen/', function(req, res){

	db.models.taktZeichens.find(function(err, result){
		if (err) {
			return console.err(err);
			res.status(500).send('Keine taktischen Zeichen gefunden.');
		}

		res.send(result);
	});
});

/* liefert das Zeichen mit der ID :id als JSON */
app.get('/zeichen/:id/', function(req, res){
	var zeichenId = req.params.id;

	db.models.taktZeichens.findOne({id: zeichenId}, function(err, result){
		if (err) {
			return console.err(err);
			res.status(500).send('Konnte taktisches Zeichen mit der ID: '+ zeichenId +' nicht finden.');
		}
		res.send(result);
	});
});

/* liefert den String des Attributs Svg zurück */
app.get('/zeichen/:id/svg/', function(req, res){
	var zeichenId = req.params.id;

	db.models.taktZeichens.findOne({id: zeichenId}, {Svg: 1}, function(err, result){
		if (err) {
			return console.err(err);
			res.status(500).send('Konnte Svg des taktischen Zeichens mit der ID: ' + zeichenId + 'nicht finden.');
		}
		
		res.send(result.Svg);
	});
});





//start the server on Port 8080
var server = app.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
