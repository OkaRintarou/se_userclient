import request from "request";
import * as readline from "readline";

//用户客户端需要具备的功能包括：
// 注册、登录；
// 查看充电详单信息，至少包含如下字段：详单编号、详单生成时间、充电桩编号、充电电量、
// 充电时长、启动时间、停止时间、充电费用、服务费用、总费用；
// 提交或修改充电请求，包括充电模式（快充/慢充）、本次请求充电量；
// 查看本车排队号码；
// 查看本充电模式下前车等待数量；
// 结束充电。

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

// 定时发送，判断自身状态
type checkReq = { type: "check", userID: string }
type checkRes = { status: "wait" | "charging" | "idle"|"chargerWait" }

enum Status {
    init,
    reg0, reg1, reg2,
    login0, login1,
    charge0, charge1,
    changeMode0, changeMode1
}


function help() {
    console.log(`\u001b[33m输入数字以发起请求:
    1. 注册
    2. 登录
    3. 输出详单
    4. 充电
    5. 改变充电模式及充电量
    6. 查看排队号码
    7. 查看前车等待数量
    8. 结束充电
    0. 退出客户端\u001b[0m
    \u001b[31m输入其他内容以刷新提示\u001b[0m`)
}

let userID = "null"
let pwd1 = "null"
let pwd2 = "null"
let mode = "T"
let capacity = 0

console.log("\u001b[34mCharger client\u001b[0m")
console.log("-".repeat(30))
help()
let status = Status.init;
const rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt("\u001b[32m> \u001b[0m");
rl.prompt()
rl.on("line", input => {
    switch (status) {
        case Status.init:
            switch (input) {
                case"1"://注册
                    status = Status.reg0
                    console.log("输入用户名:")
                    rl.prompt()
                    break;
                case "2"://登录
                    status = Status.login0
                    console.log("输入用户名:")
                    rl.prompt()
                    break
                case "3"://详单
                    let deReq: detailReq = {type: "detail", userID: userID}
                    requestFunc(deReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as detailRes
                            console.log(`详单编号: ${body.ID}\n` +
                                `详单生成时间: ${body.time}\n` +
                                `充电桩编号: ${body.chargerID}\n` +
                                `充电电量: ${body.capacity}\n` +
                                `充电时长: ${body.chargeTime}\n` +
                                `启动时间: ${body.beginTime}\n` +
                                `停止时间: ${body.endTime}\n` +
                                `充电费用: ${body.chargeBill}\n` +
                                `服务费用: ${body.serviceBill}\n` +
                                `总费用: ${body.totalBill}`)
                        }
                    })
                    rl.prompt()
                    break
                case"4"://充电
                    status = Status.charge0
                    console.log("输入充电模式(F/T):")
                    rl.prompt()
                    break
                case"5"://更改
                    status = Status.changeMode0
                    console.log("输入更改充电模式(F/T):")
                    rl.prompt()
                    break
                case"6"://排队
                    let wReq: waitNumReq = {type: "waitNum", userID: userID}
                    requestFunc(wReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as waitNumRes
                            console.log(`排队号码: ${body.waitNum}`)
                        }
                    })
                    rl.prompt()
                    break
                case "7"://前车
                    let fReq: numForwardReq = {type: "forward", userID: userID}
                    requestFunc(fReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as numForwardRes
                            console.log(`前车等待数量: ${body.num}`)
                        }
                    })
                    rl.prompt()
                    break
                case "8"://结束充电
                    let cReq: closeReq = {type: "close", userID: userID}
                    requestFunc(cReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as closeRes
                            switch (body.type) {
                                case "OK":
                                    console.log("结束充电")
                                    break
                                default:
                                    console.log("出错!")
                                    break
                            }
                        }
                    })
                    rl.prompt()
                    break
                case"0":
                    rl.close();
                    break
                default:
                    help()
                    rl.prompt()
                    break
            }
            break;
        case Status.reg0://获取用户名
            userID = input
            console.log("输入密码:")
            rl.prompt()
            status = Status.reg1
            break
        case Status.reg1://获取密码
            pwd1 = input
            console.log("确认密码:")
            rl.prompt()
            status = Status.reg2
            break
        case Status.reg2://确认密码
            pwd2 = input
            let regReq: registerReq = {type: "register", userID: userID, pwd1: pwd1, pwd2: pwd2}
            requestFunc(regReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as registerRes
                    switch (body.type) {
                        case "OK":
                            console.log("注册成功")
                            break
                        default:
                            console.log("出错!（两次密码不一致或是用户名已经占用）")
                            break
                    }
                }
            })
            rl.prompt()
            status = Status.init
            break
        case Status.login0:
            userID = input
            console.log("输入密码:")
            rl.prompt()
            status = Status.login1
            break;
        case Status.login1:
            pwd1 = input
            let logReq: loginReq = {type: "login", userID: userID, pwd: pwd1}
            requestFunc(logReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as loginRes
                    switch (body.type) {
                        case "OK":
                            console.log("登录成功")
                            break
                        default:
                            console.log("密码错误或用户不存在！")
                            break
                    }
                }
            })
            rl.prompt()
            status = Status.init
            break
        case Status.charge0:
            mode = input
            console.log("输入充电量:")
            rl.prompt()
            status = Status.charge1
            break;
        case Status.charge1:
            capacity = parseInt(input)
            let cReq: chargeReq
            if (mode == "F")
                cReq = {type: "charge", userID: userID, mode: mode, capacity: capacity}
            else
                cReq = {type: "charge", userID: userID, mode: "T", capacity: capacity}
            requestFunc(cReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as chargeRes
                    switch (body.type){
                        case "OK":
                            console.log(`请求成功，排队号码为: ${body.waitNum}`)
                            break
                        default:
                            console.log("出错！")
                            break
                    }
                }
            })
            rl.prompt()
            status = Status.init
            break
        case Status.changeMode0:
            mode = input
            console.log("输入更改充电量:")
            rl.prompt()
            status = Status.changeMode1
            break;
        case Status.changeMode1:
            capacity = parseInt(input)
            let cmReq: changeModeReq
            if (mode == "F")
                cmReq = {type: "changeMode", userID: userID, mode: mode, capacity: capacity}
            else
                cmReq = {type: "changeMode", userID: userID, mode: "T", capacity: capacity}
            requestFunc(cmReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as changeModeRes
                    switch (body.type){
                        case "OK":
                            console.log(`更改请求成功，排队号码为: ${body.waitNum}`)
                            break
                        default:
                            console.log("出错！")
                            break
                    }
                }
            })
            rl.prompt()
            status = Status.init
            break
    }
})

// 设置结束事件
rl.on("close", () => {
    console.log("Bye.")
    process.exit(0)
})

// 用于发送请求的函数
function requestFunc(payload: object, callback: (err: any, res: request.Response, body: any) => void) {
    request.post({
        url: "http://127.0.0.1:3000/",
        method: "POST",
        json: true,
        headers: {
            "content-type": "application/json"
        },
        body: payload
    }, callback)
}
