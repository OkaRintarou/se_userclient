import express from "express";
import bodyParser from "body-parser";

type registerReq = { type: "register", userID: string, pwd1: string, pwd2: string }
type registerRes = { type: "OK" | "ERR" }

type loginReq = { type: "login", userID: string, pwd: string }
type loginRes = { type: "OK" | "ERR" }

type detailReq = { type: "detail", userID: string }
type detailRes = {
    ID: string, time: string, chargerID: string, capacity: number,
    chargeTime: number, beginTime: string, endTime: string, chargeBill: number,
    serviceBill: number, totalBill: number
}

type chargeReq = { type: "charge", userID: string, mode: "F" | "T", capacity: number }
type chargeRes = { type: "OK" | "ERR", waitNum: string }

type changeModeReq = { type: "changeMode", userID: string, mode: "F" | "T", capacity: number }
type changeModeRes = { type: "OK" | "ERR", waitNum: string }

type waitNumReq = { type: "waitNum", userID: string }
type waitNumRes = { waitNum: string }

type numForwardReq = { type: "forward", userID: string }
type numForwardRes = { num: number }

type closeReq = { type: "close", userID: string }
type closeRes = { type: "OK" | "ERR" }

type checkReq = { type: "check", userID: string }
type checkRes = { status: "wait" | "charging" | "idle" }


const port = 3000;
const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.post('/', (req, res) => {
    let p = req.body
    console.log(p)
    let sendBack: { [key: string]: any } = {}
    switch (p.type) {
        case"register":
            sendBack.type = "ERR"
            break
        case"login":
            sendBack.type = "OK"
            break
        case "detail":
            sendBack.ID = "0"
            sendBack.time = "2022.6.3 17:30"
            sendBack.chargerID = "T_ID1"
            sendBack.capacity = "10"
            sendBack.chargeTime = "10min"
            sendBack.beginTime = "17:20"
            sendBack.endTime = "17:50"
            sendBack.chargeBill = "10"
            sendBack.serviceBill = "10"
            sendBack.totalBill = "20"
            break
        case "charge":
            sendBack.type="OK"
            sendBack.waitNum="T1"
            break
        case "changeMode":
            sendBack.type="ERR"
            sendBack.waitNum="null"
            break
        case "waitNum":
            sendBack.waitNum = "T1"
            break
        case"forward":
            sendBack.num = 10
            break
        case "close":
            sendBack.type = "OK"
            break
        case "check":
            sendBack.status = "idle"
            break
    }
    res.send(sendBack)
})


app.listen(port, () => {
    console.log(`listening on ${port}.`);
});
