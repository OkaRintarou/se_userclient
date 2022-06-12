import express from "express";
import bodyParser from "body-parser";

let time = ""

// 设置参数
const FastChargingPileNum = 2
const TrickleChargingPileNum = 3
const WaitingAreaSize = 6
const ChargingQueueLen = 3

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
type checkRes = { status: "wait" | "charging" | "idle" | "chargerWait" }

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
    let u: UserInfo | null = null
    switch (p.type) {
        //user client
        case"register":
            sendBack = UserInfo.addUser(p)
            break
        case"login":
            sendBack = UserInfo.login(p)
            break
        case "detail":
            u = UserInfo.getUser((p as detailReq).userID)
            if (u != null)
                sendBack = u.detail ?? {}
            break
        case "charge":
            u = UserInfo.getUser((p as chargeReq).userID)
            if (u != null) {
                u.mode = (p as chargeReq).mode
                u.capacity = (p as chargeReq).capacity
                if (WaitingArea.add(u)) {
                    sendBack.type = "OK"
                    sendBack.waitNum = WaitingArea.getWaitNum(u)
                } else {
                    sendBack.type = "ERR"
                }
            } else {
                sendBack.type = "ERR"
            }
            break
        case "changeMode":
            u = UserInfo.getUser((p as changeModeReq).userID)
            if (u != null) {
                if (WaitingArea.remove(u)) {
                    u.mode = (p as changeModeReq).mode
                    u.capacity = (p as changeModeReq).capacity
                    if (WaitingArea.add(u)) {
                        sendBack.type = "OK"
                        sendBack.waitNum = WaitingArea.getWaitNum(u)
                    } else {
                        sendBack.type = "ERR"
                        sendBack.waitNum = "null"
                    }
                } else {
                    sendBack.type = "ERR"
                    sendBack.waitNum = "null"
                }
            } else {
                sendBack.type = "ERR"
                sendBack.waitNum = "null"
            }
            break
        case "waitNum":
            u = UserInfo.getUser((p as changeModeReq).userID)
            if (u != null) {
                sendBack.waitNum = WaitingArea.getWaitNum(u)
            } else {
                sendBack.waitNum = "null"
            }
            break
        case"forward":
            u = UserInfo.getUser((p as changeModeReq).userID)
            if (u != null) {
                sendBack.num = WaitingArea.getForwardNum(u)
            } else {
                sendBack.num = -1
            }
            break
        case "close":
            u = UserInfo.getUser((p as closeReq).userID)
            if (u != null) {
                UserInfo.close(u)
                sendBack.type = "OK"
            } else {
                sendBack.type = "ERR"
            }
            break
        case "check":
            sendBack = UserInfo.getStatus(p)
            break


        // admin client
        case"startCharge":
            //todo 这我不知道什么意思，但充电桩自动给队列中的第一个充电，
            // chargerID命名方式为F_0，T_0
            // 需要注意个问题，充电桩类几乎没有什么活动信息，我全保存在用户类里了

            sendBack.type = "OK"
            sendBack.chargerID = p.chargerID
            sendBack.chargerStatus = "working"
            break
        case"endCharge":
            //todo 同理，每5s自动调用的方法会自动开始充电，需要改的有点多
            sendBack.type = "OK"
            sendBack.chargerID = p.chargerID
            sendBack.chargerStatus = "closed"
            break
        case "showCharge":
            //todo
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
            //todo
            sendBack.chargerID = p.chargerID
            sendBack.userID = "004"
            sendBack.carCapacity = 1113
            sendBack.capacity = 1113
            sendBack.queueTime = 16
            break
        case "showTable":
            for (let i = 0; i < UserInfo.detailList.length; i++) {
                a = UserInfo.detailList[i]
                sendBack[i] = a
                a = {}
            }
            break
    }
    console.log("Send:")
    console.log(sendBack)
    res.send(sendBack)
})

// 监听端口3000
app.listen(port, () => {
    console.log(`listening on ${port}.`);
});


class UserInfo {
    // 用户列表
    static userList: UserInfo[] = []
    static {
        // 预置用户
        UserInfo.userList.push(new UserInfo("1", "1"),
            new UserInfo("2", "2"),
            new UserInfo("3", "3"),
            new UserInfo("4", "4"),
            new UserInfo("5", "5"),
            new UserInfo("6", "6"),
            new UserInfo("7", "7"),
            new UserInfo("8", "8"),
            new UserInfo("9", "9"),
            new UserInfo("10", "10"),
        )

    }

    constructor(userID: string, pwd: string) {
        this.userID = userID
        this.pwd = pwd
    }

    userID: string;
    pwd: string;
    status: "idle" | "wait" | "charging" | "chargerWait" = "idle"
    capacity: number = 0;
    mode: "F" | "T" = "T"
    alreadyChargeCapacity = 0
    beginTime = "";
    endTime = ""
    pile: ChargingPile | null = null
    detail: detailRes | null = null
    static detailList: detailRes[] = []

    // 结账并生成详单，详单保存至detail，并在detailList备份一份，调用此方法时车辆已经离开充电桩，
    // 且alreadyChargeCapacity，beginTime，endTime，status均已赋值
    pay() {
        //todo
    }

    // 添加用户
    static addUser(req: registerReq): registerRes {
        for (let u of UserInfo.userList) {
            if (u.userID == req.userID)
                return {type: "ERR"}
        }
        if (req.pwd1 == req.pwd2) {
            UserInfo.userList.push(new UserInfo(req.userID, req.pwd1))
            return {type: "OK"}
        }
        return {type: "ERR"}
    }

    // 登录
    static login(req: loginReq): loginRes {
        let ru = null
        for (let u of UserInfo.userList) {
            if (u.userID == req.userID) {
                ru = u
                break
            }
        }
        if (ru == null) return {type: "ERR"}
        if (ru.pwd == req.pwd) return {type: "OK"}
        return {type: "ERR"}
    }

    // 获取用户状态
    static getStatus(req: checkReq): checkRes {
        for (let u of UserInfo.userList) {
            if (u.userID == req.userID) {
                return {status: u.status}
            }
        }
        return {status: "idle"}
    }

    // 获取用户
    static getUser(userID: string): UserInfo | null {
        for (let u of UserInfo.userList) {
            if (u.userID == userID) {
                return u
            }
        }
        return null
    }

    // 取消充电
    static close(user: UserInfo): boolean {
        switch (user.status) {
            case "wait":
                WaitingArea.remove(user)
                break
            case "chargerWait":
                ChargingPile.removeWait(user)
                break
            case "charging":
                ChargingPile.removeCharging(user)
                break
        }
        return true
    }

}

class ChargingPile {
    constructor(id: string) {
        this.id = id
    }

    id: string;
    userList: UserInfo[] = []

    static removeWait(user: UserInfo) {
        for (let i = 0; i < user.pile!!.userList.length; i++) {
            if (user.pile?.userList[i].userID == user.userID) {
                user.pile.userList.splice(i, 1)
                user.endTime = time
                user.status = "idle"
            }
        }
    }

    static removeCharging(user: UserInfo) {
        this.removeWait(user)
        user.pay()
    }


}

class FastChargingPile extends ChargingPile {
    static piles: FastChargingPile[] = []
    static {
        for (let i = 0; i < FastChargingPileNum; i++) {
            FastChargingPile.piles.push(
                new FastChargingPile(`T_${i}`)
            )
        }
    }

    // 获取等待时间最短且队列有位置的充电桩
    static getBest(): FastChargingPile | null {
        let minID = -1
        let tmpMin = 99999999999;
        for (let i = 0; i < FastChargingPileNum; i++) {
            let tmp = 0
            for (let u of FastChargingPile.piles[i].userList) {
                tmp += u.capacity
            }
            if (FastChargingPile.piles[i].userList.length < ChargingQueueLen && tmp < tmpMin) {
                tmpMin = tmp
                minID = -1
            }
        }
        if (minID == -1) return null
        return FastChargingPile.piles[minID]
    }


}

class TrickleChargingPile extends ChargingPile {
    static piles: TrickleChargingPile[] = []
    static {
        for (let i = 0; i < TrickleChargingPileNum; i++) {
            TrickleChargingPile.piles.push(
                new TrickleChargingPile(`T_${i}`)
            )
        }
    }


    // 获取等待时间最短且队列有位置的充电桩
    static getBest(): TrickleChargingPile | null {
        let minID = -1
        let tmpMin = 99999999999;
        for (let i = 0; i < TrickleChargingPileNum; i++) {
            let tmp = 0
            for (let u of TrickleChargingPile.piles[i].userList) {
                tmp += u.capacity
            }
            if (TrickleChargingPile.piles[i].userList.length < ChargingQueueLen && tmp < tmpMin) {
                tmpMin = tmp
                minID = -1
            }
        }
        if (minID == -1) return null
        return TrickleChargingPile.piles[minID]

    }

}

class WaitingArea {
    static waitingList: UserInfo[] = []

    static add(u: UserInfo): boolean {
        if (this.waitingList.length < WaitingAreaSize) {
            u.status = "wait"
            this.waitingList.push(u)
            return true
        }
        return false
    }

    static getWaitNum(user: UserInfo): string {
        let f = 0
        let t = 0
        for (let u of WaitingArea.waitingList) {
            if (u.mode == "F") f++
            else t++
            if (u.userID == user.userID) break
        }
        if (user.mode == "F") return `F${f}`
        else return `T${t}`
    }

    static getForwardNum(user: UserInfo): number {
        if (user.status != "chargerWait")
            return -1;
        if (user.mode == "F") {
            for (let pile of FastChargingPile.piles) {
                for (let i = 0; i < pile.userList.length; i++) {
                    if (pile.userList[i].userID == user.userID)
                        return i;
                }
            }
        } else {
            for (let pile of TrickleChargingPile.piles) {
                for (let i = 0; i < pile.userList.length; i++) {
                    if (pile.userList[i].userID == user.userID)
                        return i;
                }
            }
        }
        return -1
    }

    static remove(user: UserInfo): boolean {
        for (let i = 0; i < WaitingArea.waitingList.length; i++) {
            if (WaitingArea.waitingList[i].userID == user.userID) {
                WaitingArea.waitingList[i].status = "idle"
                WaitingArea.waitingList.splice(i, 1)
                return true
            }
        }
        return false;
    }
}

// 将等候区的车辆送去充电桩的排队队列
function addToCharger() {
    let flag = true
    while (flag) {
        let flag1 = true
        let p: ChargingPile | null = null;
        for (let i = 0; i < WaitingArea.waitingList.length; i++) {
            if (WaitingArea.waitingList[i].mode == "F") {
                p = FastChargingPile.getBest()
            } else {
                p = TrickleChargingPile.getBest()
            }
            if (p != null) {
                flag1 = false
                p.userList.push(WaitingArea.waitingList[i])
                WaitingArea.waitingList[i].status = "chargerWait"
                WaitingArea.waitingList.splice(i, 1)
                break
            }
        }
        if (flag1) flag = false
    }
}

// 各充电桩给1号位充电1h，充满离场
function chargersRun() {
    for (let pile of FastChargingPile.piles) {
        if (pile.userList.length != 0) {
            let u = pile.userList[0]
            if (u.status != "charging") {
                u.status = "charging"
                u.beginTime = time
            }
            u.alreadyChargeCapacity += 30
            if (u.alreadyChargeCapacity >= u.capacity) {
                u.alreadyChargeCapacity = u.capacity
                u.status = "idle"
                ChargingPile.removeCharging(u)
            }
        }
    }
    for (let pile of TrickleChargingPile.piles) {
        if (pile.userList.length != 0) {
            let u = pile.userList[0]
            if (u.status != "charging") {
                u.status = "charging"
                u.beginTime = time
            }
            u.alreadyChargeCapacity += 10
            if (u.alreadyChargeCapacity >= u.capacity) {
                u.alreadyChargeCapacity = u.capacity
                u.status = "idle"
                ChargingPile.removeCharging(u)
            }
        }
    }
}


// todo 更新时间，1h为单位，变量为time，初值没设置，在最上面
function updateTime() {

}


// 定时触发任务，每5s当1h
setInterval(() => {
    addToCharger()
    chargersRun()
    updateTime()
}, 5000)
