import express from "express";
import bodyParser from "body-parser";
import * as ReadLine from "readline";

// 设置参数
const FastChargingPileNum = 3
const TrickleChargingPileNum = 2
const WaitingAreaSize = 10
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

type endChargeReq = { type: "endCharge", chargerID: string, time: number }
type endChargeRes = { type: "OK" | "ERR", chargerID: string, chargerStatus: "working" | "idle" | "failed" }

type showChargeReq = { type: "showCharge" }
type showChargeRes = {
    chargerID: string, chargerStatus: "working" | "idle" | "failed",
    chargerCount: number, chargerTimeSum: number, capacitySum: number
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
    let pile: ChargingPile
    let i = 0;
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
                    u.alreadyChargeCapacity = 0
                    u.beginTime = "";
                    u.endTime = "";
                    u.cBill = 0;
                    u.sBill = 0;
                    u.time = 0
                    u.waitTime = 0
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
                        u.alreadyChargeCapacity = 0
                        u.beginTime = "";
                        u.endTime = "";
                        u.cBill = 0;
                        u.sBill = 0;
                        u.time = 0
                        u.waitTime = 0
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
            pile = ChargingPile.getChargerPile((p as startChargeReq).chargerID)
            sendBack = ChargingPile.startCharger(pile)
            break
        case"endCharge":
            pile = ChargingPile.getChargerPile((p as endChargeReq).chargerID)
            sendBack = ChargingPile.closeCharger(pile, (p as endChargeReq).time)
            break
        case "showCharge":
            i = 0
            for (; i < FastChargingPileNum; i++) {
                a.chargerID = FastChargingPile.piles[i].id
                a.chargerStatus = ChargingPile.getChargerStatus(FastChargingPile.piles[i])
                a.chargerCount = FastChargingPile.piles[i].chargeTimes
                a.chargerTimeSum = FastChargingPile.piles[i].totalTime
                a.capacitySum = FastChargingPile.piles[i].totalCapacity
                sendBack[i] = a
                a = {}
            }
            for (let j = 0; j < TrickleChargingPileNum; j++) {
                a.chargerID = TrickleChargingPile.piles[j].id
                a.chargerStatus = ChargingPile.getChargerStatus(TrickleChargingPile.piles[j])
                a.chargerCount = TrickleChargingPile.piles[j].chargeTimes
                a.chargerTimeSum = TrickleChargingPile.piles[j].totalTime
                a.capacitySum = TrickleChargingPile.piles[j].totalCapacity
                sendBack[i] = a
                i++
                a = {}
            }
            break
        case "WaitCarMessage":
            pile = ChargingPile.getChargerPile((p as waitCarReq).chargerID)
            sendBack = pile.waitCarInfo
            break
        case "showTable":
            i = 0
            for (; i < FastChargingPileNum; i++) {
                a.date = `${Time.getTime()}`
                a.chargerID = FastChargingPile.piles[i].id
                a.chargerCount = FastChargingPile.piles[i].chargeTimes
                a.chargerTimeSum = FastChargingPile.piles[i].totalTime
                a.capacitySum = FastChargingPile.piles[i].totalCapacity
                a.chargerBillSum = FastChargingPile.piles[i].cBill
                a.serviceBillSum = FastChargingPile.piles[i].sBill
                a.totalBillSum = FastChargingPile.piles[i].totalBill
                sendBack[i] = a
                a = {}
            }
            for (let j = 0; j < TrickleChargingPileNum; j++) {
                a.date = `${Time.getTime()}`
                a.chargerID = TrickleChargingPile.piles[j].id
                a.chargerCount = TrickleChargingPile.piles[j].chargeTimes
                a.chargerTimeSum = TrickleChargingPile.piles[j].totalTime
                a.capacitySum = TrickleChargingPile.piles[j].totalCapacity
                a.chargerBillSum = TrickleChargingPile.piles[j].cBill
                a.serviceBillSum = TrickleChargingPile.piles[j].sBill
                a.totalBillSum = TrickleChargingPile.piles[j].totalBill
                sendBack[i] = a
                i++
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

    // 构造函数
    constructor(userID: string, pwd: string) {
        this.userID = userID
        this.pwd = pwd
    }

    userID: string;
    pwd: string;
    // 闲置，等候区，充电中，充电桩队列
    status: "idle" | "wait" | "charging" | "chargerWait" = "idle"
    // 目标充电量
    capacity: number = 0;
    // 充电模式
    mode: "F" | "T" = "T"
    // 已经充电量
    alreadyChargeCapacity = 0
    beginTime = "";
    endTime = "";
    cBill = 0;
    sBill = 0;
    //充电时长
    time = 0
    //排队时长
    waitTime = 0

    get totalBill() {
        return this.cBill + this.sBill;
    }

    // 分配到的充电桩
    pile: ChargingPile | null = null
    // 详单，结束充电时生成
    detail: detailRes | null = null
    // 历史上产生的所有详单
    static detailList: detailRes[] = []

    addBill() {
        let unit: number
        if (this.mode == "F") unit = 30 / 12
        else unit = 10 / 12
        if ((Time.hour >= 10 && Time.hour < 15)
            || (Time.hour >= 18 && Time.hour < 21)) {
            this.cBill += unit
            this.sBill += unit * 0.8
            this.pile!!.cBill += unit
            this.pile!!.sBill += unit * 0.8
        } else if ((Time.hour >= 7 && Time.hour < 10) ||
            (Time.hour >= 15 && Time.hour < 18) ||
            (Time.hour >= 21 && Time.hour < 23)) {
            this.cBill += unit * 0.7
            this.sBill += unit * 0.8
            this.pile!!.cBill += unit * 0.7
            this.pile!!.sBill += unit * 0.8
        } else {
            this.cBill += unit * 0.4
            this.sBill += unit * 0.8
            this.pile!!.cBill += unit * 0.4
            this.pile!!.sBill += unit * 0.8
        }
    }


    // 其实是生成详单
    pay(isError: boolean) {
        this.detail = {
            ID: this.userID,
            time: Time.getTimeN(),
            chargerID: this.pile?.id ?? "null",
            capacity: this.alreadyChargeCapacity,
            chargeTime: this.time,
            beginTime: this.beginTime,
            endTime: this.endTime,
            chargeBill: this.cBill,
            serviceBill: this.sBill,
            totalBill: this.totalBill
        }
        if (isError) {
            this.detail.time = Time.getTime()
        }
    }

    // 注册新用户
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

    // 获取用户引用
    static getUser(userID: string): UserInfo | null {
        for (let u of UserInfo.userList) {
            if (u.userID == userID) {
                return u
            }
        }
        return null
    }

    // 取消充电，充电中会自动结账
    static close(user: UserInfo): boolean {
        switch (user.status) {
            case "wait":
                WaitingArea.remove(user)
                break
            case "chargerWait":
                ChargingPile.removeWait(user, true)
                break
            case "charging":
                ChargingPile.removeCharging(user, true)
                break
        }
        return true
    }

}

// 充电桩基类
class ChargingPile {
    static errorList: UserInfo[] = []

    constructor(id: string) {
        this.id = id
    }

    //充电桩id
    id: string;
    // 充电桩对应队列
    userList: UserInfo[] = []
    // 是否可用
    available = true
    // 剩余故障时间
    errorTimeLast = 0;
    // 充电次数
    chargeTimes = 0
    // 充电总时长
    totalTime = 0
    // 充电总电量
    totalCapacity = 0

    // 总费用
    get totalBill() {
        return this.cBill + this.sBill
    }

    // 充电费用
    cBill = 0
    // 服务费用
    sBill = 0


    get waitCarInfo(): { [key: string]: any } {
        let a: { [key: string]: any } = {}
        let r: { [key: string]: any } = {}
        for (let i = 1; i < this.userList.length; i++) {
            a.chargerID = this.id
            a.userID = this.userList[i].userID
            a.carCapacity = 10000
            a.capacity = this.userList[i].capacity
            a.queueTime = this.userList[i].waitTime
            r[i - 1] = a
            a = {}
        }
        return r
    }


    // 移除充电桩队列的等候者
    static removeWait(user: UserInfo, isError: boolean) {
        for (let i = 0; i < user.pile!!.userList.length; i++) {
            if (user.pile?.userList[i].userID == user.userID) {
                user.pile.userList.splice(i, 1)
                if (isError)
                    user.endTime = Time.getTime()
                else
                    user.endTime = Time.getTimeN()
                user.status = "idle"
            }
        }
    }

    // 移除正在充电并结账
    static removeCharging(user: UserInfo, isError: boolean) {
        this.removeWait(user, isError)
        user.pay(isError)
    }

    static getChargerPile(chargerID: string): ChargingPile {
        let mode = chargerID[0]
        let id = Number(chargerID.substring(2))
        if (mode == "F") return FastChargingPile.piles[id]
        else return TrickleChargingPile.piles[id]
    }

    static getChargerStatus(pile: ChargingPile): "working" | "idle" | "failed" {
        if (!pile.available) return "failed"
        if (pile.userList.length == 0) return "idle"
        return "working"
    }


    // 启动充电桩
    static startCharger(pile: ChargingPile): startChargeRes {
        pile.available = true
        pile.errorTimeLast = 0
        return {type: "OK", chargerID: pile.id, chargerStatus: ChargingPile.getChargerStatus(pile)}
    }

    static closeCharger(pile: ChargingPile, time: number):
        endChargeRes {
        pile.available = false
        pile.errorTimeLast = time
        return {type: "OK", chargerID: pile.id, chargerStatus: "failed"}
    }


}

// 快充
class FastChargingPile extends ChargingPile {
    // 所有快充列表
    static piles: FastChargingPile[] = []
    static {
        for (let i = 0; i < FastChargingPileNum; i++) {
            FastChargingPile.piles.push(
                new FastChargingPile(`F_${i}`)
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
            if (FastChargingPile.piles[i].available &&
                FastChargingPile.piles[i].userList.length < ChargingQueueLen &&
                tmp < tmpMin) {
                tmpMin = tmp
                minID = i
            }
        }
        if (minID == -1) return null
        return FastChargingPile.piles[minID]
    }


}

//慢充
class TrickleChargingPile extends ChargingPile {
    // 所有慢充列表
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
            if (TrickleChargingPile.piles[i].available &&
                TrickleChargingPile.piles[i].userList.length < ChargingQueueLen &&
                tmp < tmpMin) {
                tmpMin = tmp
                minID = i
            }
        }
        if (minID == -1) return null
        return TrickleChargingPile.piles[minID]

    }

}

//等候区
class WaitingArea {
    // 等候区列表
    static waitingList: UserInfo[] = []

    // 添加入等候区，充电请求都会先放在这
    static add(u: UserInfo): boolean {
        if (this.waitingList.length < WaitingAreaSize) {
            u.status = "wait"
            this.waitingList.push(u)
            return true
        }
        return false
    }

    // 获取等候区排号
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

    // 获取所在充电桩队列前方的人数
    static getForwardNum(user: UserInfo): number {
        if (user.status != "chargerWait")
            return -1;
        if (user.mode == "F") {
            for (let pile of FastChargingPile.piles) {
                for (let i = 0; i < pile.userList.length; i++) {
                    if (pile.userList[i].userID == user.userID)
                        return i - 1;
                }
            }
        } else {
            for (let pile of TrickleChargingPile.piles) {
                for (let i = 0; i < pile.userList.length; i++) {
                    if (pile.userList[i].userID == user.userID)
                        return i - 1;
                }
            }
        }
        return -1
    }

    // 从等候区移除
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

// 将等候区的车辆送去充电桩的排队队列，一次执行遍历等候区所有车辆
function addToCharger(list: UserInfo[]) {
    let flag = true
    while (flag) {
        let flag1 = true
        let p: ChargingPile | null = null;
        for (let i = 0; i < list.length; i++) {
            if (list[i].mode == "F") {
                p = FastChargingPile.getBest()
            } else {
                p = TrickleChargingPile.getBest()
            }
            if (p != null) {
                flag1 = false
                p.userList.push(list[i])
                list[i].pile = p
                list[i].status = "chargerWait"
                list.splice(i, 1)
                break
            }
        }
        if (flag1) flag = false
    }
}

// 各充电桩给1号位充电1h，充满离场结账
function chargersRun() {
    for (let pile of FastChargingPile.piles) {
        if (pile.userList.length != 0) {
            let u = pile.userList[0]
            if (u.status != "charging") {
                u.status = "charging"
                u.beginTime = Time.getTime()
                pile.chargeTimes++
            }
            pile.totalTime += 5
            u.time += 5
            pile.totalCapacity += 30 / 12
            u.alreadyChargeCapacity += 30 / 12
            u.addBill()
            if (u.alreadyChargeCapacity >= u.capacity) {
                u.alreadyChargeCapacity = u.capacity
                u.status = "idle"
                ChargingPile.removeCharging(u, false)
            }
        }
    }
    for (let pile of TrickleChargingPile.piles) {
        if (pile.userList.length != 0) {
            let u = pile.userList[0]
            if (u.status != "charging") {
                u.status = "charging"
                u.beginTime = Time.getTime()
                pile.chargeTimes++
            }
            pile.totalTime += 5
            u.time += 5
            pile.totalCapacity += 10 / 12
            u.alreadyChargeCapacity += 10 / 12
            u.addBill()
            if (u.alreadyChargeCapacity >= u.capacity) {
                u.alreadyChargeCapacity = u.capacity
                u.status = "idle"
                ChargingPile.removeCharging(u, false)
            }
        }
    }
}


class Time {
    static hour: number = 6
    static min: number = 0

    // 一次+5min
    static update() {
        this.min += 5
        if (this.min >= 60) {
            this.hour += 1
            this.min -= 60
        }
    }

    static getTime(): string {
        return `${this.hour}:${this.min}`
    }

    static getTimeN(): string {
        let lh = this.hour
        let lm = this.min + 5
        if (lm >= 60) {
            lh++
            lm -= 60
        }
        return `${lh}:${lm}`
    }

}

function checkError(piles: ChargingPile[]) {
    for (let pile of piles) {
        if (pile.available || pile.userList.length == 0) continue
        if (pile.errorTimeLast == 0) {
            pile.available = true
            continue
        }
        let u = pile.userList[0]
        ChargingPile.removeCharging(u, true)
        let list: UserInfo[] = []
        list.push(u)
        list.push(...pile.userList)
        addToCharger(list)
        if (list.length != 0)
            ChargingPile.errorList.push(...list)
        pile.errorTimeLast -= 5
        if (pile.errorTimeLast <= 0) pile.errorTimeLast = 0
    }
}

function updateWaitTime() {
    for (let u of WaitingArea.waitingList) {
        u.waitTime += 5
    }
    for (let p of FastChargingPile.piles) {
        for (let i = 1; i < p.userList.length; i++) {
            p.userList[i].waitTime += 5
        }
    }
    for (let p of TrickleChargingPile.piles) {
        for (let i = 1; i < p.userList.length; i++) {
            p.userList[i].waitTime += 5
        }
    }
}

function errorListToCharger() {
    addToCharger(ChargingPile.errorList)
}

function printChargerInfo() {
    function printUserInfo(pile: ChargingPile) {
        console.log(`ID: ${pile.id}`)
        for (let u of pile.userList) {
            console.log(`(${u.userID},${u.alreadyChargeCapacity},${u.totalBill})`)
        }
    }

    console.log("充电桩服务信息: (车号,已充电量,当前费用)")
    for (let pile of FastChargingPile.piles) {
        printUserInfo(pile)
    }
    for (let pile of TrickleChargingPile.piles) {
        printUserInfo(pile)
    }
    console.log("-".repeat(30))
}

function printWaitingAreaInfo() {
    console.log("等候区信息: (车号,充电类型,充电量)")
    for (let u of WaitingArea.waitingList) {
        console.log(`(${u.userID},${u.mode},${u.capacity})`)
    }
    console.log("-".repeat(30))
}

function printInfo() {
    printChargerInfo()
    printWaitingAreaInfo()
}


let task = () => {
    console.log(`Last Time: ${Time.getTime()}`)
    printInfo()
    checkError(FastChargingPile.piles)
    checkError(TrickleChargingPile.piles)
    errorListToCharger()
    addToCharger(WaitingArea.waitingList)
    chargersRun()
    updateWaitTime()
    Time.update()
    console.log(`Current Time: ${Time.getTime()}`)
    printInfo()
}

const rl = ReadLine.createInterface(process.stdin, process.stdout)
rl.on("line", task)
rl.on("close", () => {
    console.log("再次输入Ctrl+C以退出。")
})
