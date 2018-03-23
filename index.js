var request = require('request');
var cheerio = require('cheerio');
var myJar = request.jar();
request = request.defaults({
    jar: true
});
var opalRecords = [];
var travelRecords = [];

const args = process.argv.slice(2).reduce((acc, arg) => {

    let [k, v = true] = arg.split('=')
    acc[k] = v
    return acc

}, {})

if (!args.user || !args.password || !args.card) {
    console.log('Usage: node index.js  user=me@example.com password="yourPassword" card=0');
    console.log('to find your card number, login to opal.com.au via browser and select your name and then activity..');
    return (-1);
}
var cardIndex = parseInt(args.card);

request.post({
    uri: 'https://www.opal.com.au/login/registeredUserUsernameAndPasswordLogin',
    form: {
        h_username: args.user,
        h_password: args.password
    }
}, function(err, httpResponse, body) {
    if (err) {
        console.log(err);
        console.log('invalid credentials given');
        return false;
    }
    var response = JSON.parse(body);
    if (response.errorMessage) {
        console.log(response.errorMessage);
        return false;
    }
    doRequest(getOpalCardActivitiesUrl(cardIndex), travelRecords);
});

function getOpalCardActivitiesUrl(cardIndex) {
    return 'https://www.opal.com.au/registered/opal-card-transactions/opal-card-activities-list?cardIndex=' + cardIndex;
}

function getOpalCardActivitiesUrlForPage(cardIndex, nextUrl) {
    getOpalCardActivitiesUrl(cardIndex) + '&' + nextUrl.substr(1)
}
async function doRequest(url, travelRecords) {
    if (!url) {
        console.log(opalRecords);
        return;
    }
    return request.get(url, handlePage);
}

function handlePage(error, response, html) {
    if (!error) {
        var $ = cheerio.load(html);
        $("#transaction-data tbody tr").each(function(r) {
            var row = [];
            $(this).find('td').each(function(td) {
                row.push($(this).text());
            });
            travelRecords.push(row);
        });

        nextUrl = $("#pagination #next").href; // .prop('href');
        if (nextUrl && nextUrl.length > 3) {
            doRequest(getOpalCardActivitiesUrlForPage(cardIndex, nextUrl), travelRecords);
        } else {
            opalRecords[cardIndex++] = travelRecords;
            console.log(travelRecords);
            // travelRecords = [];
            // console.log(cardIndex);
            // doRequest(getOpalCardActivitiesUrl(cardIndex), travelRecords);
        }
        return nextUrl;
    } else {
        console.log(error);
        return false;
    }
}