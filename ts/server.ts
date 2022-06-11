import express from "express";
import bodyParser from "body-parser";


// user client
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

// admin client
type startChargeReq = { type: "startCharge", chargerID: string }
type startChargeRes = { type: "OK" | "ERR", chargerID: string, chargerStatus: "working" | "idle" | "failed" }

type endChargeReq = { type: "endCharge", chargerID: string }
type endChargeRes = { type: "OK" | "ERR", chargerID: string, chargerStatus: "working" | "idle" | "failed" }

type showChargeReq = { type: "showCharge" }
type showChargeRes = {
    chargerID: string, chargerStatus: "working" | "idle" | "failed", chargerCount: number,
    chargerSum: number, chargerTimeSum: number, capacitySum: number
}

type waitCarReq = { type: "WaitCarMessage", chargerID: string }
type waitCarRes = {
    chargerID: string, userID: string,
    carCapacity: number, capacity: number, queueTime: number
}

type showTableReq = { type: "showTable" }
type showTableRes = {
    date: string, chargerID: string,
    chargerCount: number, chargerTimeSum: number, capacitySum: number,
    chargerBillSum: number, serviceBillSum: number, totalBillSum: number
}


const port = 3000;
const app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.post('/', (req, res) => {
    let p = req.body
    console.log("Get:")
    console.log(p)
    let sendBack: { [key: string]: any } = {}
    let a: { [key: string]: any } = {}
    switch (p.type) {
        //user client
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
            sendBack.type = "OK"
            sendBack.waitNum = "T1"
            break
        case "changeMode":
            sendBack.type = "ERR"
            sendBack.waitNum = "null"
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
        // admin client
        case"startCharge":
            sendBack.type = "OK"
            sendBack.chargerID = p.chargerID
            sendBack.chargerStatus = "working"
            break
        case"endCharge":
            sendBack.type = "OK"
            sendBack.chargerID = p.chargerID
            sendBack.chargerStatus = "closed"
            break
        case "showCharge":
            for (let i = 0; i < 3; i++) {
                a.chargerID = `${i}`
                a.chargerStatus = "working"
                a.chargerCount = 9
                a.chargerSum = 1113
                a.chargerTimeSum = 1113
                a.capacitySum = 1113
                sendBack[i] = a
                a = {}
            }
            break
        case "WaitCarMessage":
            sendBack.chargerID = p.chargerID
            sendBack.userID = "004"
            sendBack.carCapacity = 1113
            sendBack.capacity = 1113
            sendBack.queueTime = 16
            break
        case "showTable":
            for (let i = 0; i < 3; i++) {
                a.date = "6月6日第14周"
                a.chargerID = `${i}`
                a.chargerCount = 1113
                a.chargerTimeSum = 1114
                a.capacitySum = 1115
                a.chargerBillSum = 111.6
                a.serviceBillSum = 111.7
                a.totalBillSum = 111.8
                sendBack[i] = a
                a = {}
            }
            break
    }
    console.log("Send:")
    console.log(sendBack)
    res.send(sendBack)
})


app.listen(port, () => {
    console.log(`listening on ${port}.`);
});
