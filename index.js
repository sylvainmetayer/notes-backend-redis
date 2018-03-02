const express = require('express');
const app = express();
let redis = require("redis");
let client = redis.createClient();
let bluebird = require("bluebird");
let bodyParser = require("body-parser");
let async = require("async");

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/notes', (req, res) => {
    var data = req.body.data;
    client.getAsync("count").then((resultat) => {
        var noteId = resultat;
        var note = "notes:" + noteId;
        client.multi().set(note, data).incr("count").execAsync().then((result) => {
            res.send(noteId);
        });
    });
});

app.get("/notes", (req, res) => {
    client.getAsync("count").then((count) => {
        notes = [];
        for (i = 0; i < count; i++) {
            var note = "notes:" + i;
            notes.push(note);
        }

        notes_data = [];
        async.each(notes, (item, callback) => {
            client.getAsync(item).then((note_data) => {
                var obj = {};
                obj[item] = note_data;
                notes_data.push(obj);
            }).then(() => {
                callback();
            });
        }, (err) => {
            res.send(JSON.stringify(notes_data));
        });
    });
});

app.get("/notes/:id", (req, res) => {
    var id = parseInt(req.params.id);
    if (!Number.isInteger(id)) {
        res.send({ "error": "expect integer, got " + id });
        return;
    }

    client.getAsync("notes:" + id).then((note_data) => {
        var obj = {};
        obj["notes:" + id] = note_data;
        res.send(obj);
    });
});

client.on("error", () => {
    console.log("Error");
    console.log(err);
});

var server = undefined;
let start = () => {
    server = app.listen(process.env.PORT, () => {
        console.log(`'Note' listening on port ${process.env.PORT} !`);
        client.setAsync("count", 0).then(() => {
            console.log("Counter initialized");
        });
    });
}

let stop = () => {
    server.close();
    client.quit();
}

if (require.main === module) {
    start();
}

module.exports.start = start;
module.exports.close = stop;
