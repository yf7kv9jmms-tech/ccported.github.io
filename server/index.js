var express = require('express')
var Unblocker = require('unblocker');
var app = express();
const morgan = require("morgan");
console.log("STARTING");

var config = {
    prefix: "/p/"
}
var unblocker = new Unblocker(config);


// this must be one of the first app.use() calls and must not be on a subdirectory to work properly
app.use(unblocker);

app.use(morgan("dev"))
// the upgrade handler allows unblocker to proxy websockets
app.listen(process.env.PORT || 3000,()=>{
    console.log("SERVER STARTED ON PORT 3000 (F->80)")
}).on('upgrade', unblocker.onUpgrade);
