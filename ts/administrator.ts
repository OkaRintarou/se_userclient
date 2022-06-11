import request from "request";
import * as readline from "readline";

//管理员客户端需要具备的功能包括：
//一、启动、关闭充电桩
//二、查看所有充电桩状态
//（各充电桩的当前状态信息（是否正常工作、系统启动后累计充电次数、充电总时长、充电总电量））
//三、查看各充电桩等候服务的车辆信息
//（用户ID、车辆电池总容量(度)、请求充电量(度)、排队时长）
//四、报表展示
//至少包含如下字段：时间(日、周、月)、充电桩编号
//累计充电次数、累计充电时长、累计充电量、累计充电费用、累计服务费用、累计总费用

type startChargeReq = { type: "startCharge", chargerID: string }
type startChargeRes = { type: "OK" | "ERR", chargerID: string, chargerStatus: "working" | "closed" | "failed" }

type endChargeReq = { type: "endCharge", chargerID: string }
type endChargeRes = { type: "OK" | "ERR", chargerID: string, chargerStatus: "working" | "closed" | "failed" }

type showChargeReq = { type: "showCharge" }
type showChargeRes = {
    chargerID: string, chargerStatus: "working" | "closed" | "failed", chargerCount: number,
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

enum Status {
    init,
    start,
    end,
    waitCar
}

let chargerID = "null"
let chargerStatus = "working"

function help() {
    console.log(`\u001b[33m输入数字以发起请求:
    1. 启动充电桩
    2. 关闭充电桩
    3. 查看所有充电桩状态
    4. 查看充电桩等候服务的车辆信息
    5. 展示报表
    0. 退出管理员客户端\u001b[0m
    \u001b[31m输入其他内容以刷新提示\u001b[0m`)
}

console.log("\u001b[34mAdministrator client\u001b[0m")
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
                case "1":
                    //启动充电桩
                    status = Status.start
                    console.log("输入要启动的充电桩编号:")
                    rl.prompt()
                    break

                case "2":
                    //关闭充电桩
                    status = Status.end
                    console.log("输入要关闭的充电桩编号:")
                    rl.prompt()
                    break

                case "3":
                    //查看所有充电桩状态
                    let showCReq: showChargeReq = {type: "showCharge"}
                    requestFunc(showCReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as { [key: string]: any }
                            for (let [k,v] of Object.entries(body)) {
                                let b=v as showChargeRes
                                console.log(`充电桩ID: ${b.chargerID}\n` +
                                    `充电桩状态: ${b.chargerStatus}\n` +
                                    `累计充电次数: ${b.chargerCount}\n` +
                                    `充电总时长: ${b.chargerTimeSum}\n` +
                                    `充电总电量: ${b.capacitySum}`)
                                console.log('-'.repeat(30))
                            }
                        }
                    })
                    rl.prompt()
                    break

                case "4":
                    //查看充电桩等候服务的车辆信息
                    status = Status.waitCar
                    console.log("输入要充电桩编号:")
                    rl.prompt()
                    break

                case "5":
                    //展示报表
                    let showTReq: showTableReq = {type: "showTable"}
                    requestFunc(showTReq, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            body = body as { [key: string]: any }
                            for(let [k,v] of Object.entries(body)) {
                                let b = v as showTableRes
                                console.log(`日周月: ${b.date}\n` +
                                    `充电桩ID: ${b.chargerID}\n` +
                                    `累计充电次数: ${b.chargerCount}\n` +
                                    `累计充电时长: ${b.chargerTimeSum}\n` +
                                    `累计充电量: ${b.capacitySum}\n` +
                                    `累计充电费用: ${b.chargerBillSum}\n` +
                                    `累计服务费用: ${b.serviceBillSum}\n` +
                                    `累计总费用: ${b.totalBillSum}`)
                                console.log("-".repeat(30))
                            }
                        }
                    })
                    rl.prompt()
                    break

                case "0":
                    rl.close();
                    break

                default:
                    help()
                    rl.prompt()
                    break
            }
            break

        case Status.start:
            chargerID = input
            let startReq: startChargeReq = {type: "startCharge", chargerID: chargerID}
            requestFunc(startReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as startChargeRes
                    switch (body.type) {
                        case "OK":
                            console.log(`启动${body.chargerID}号充电桩成功，当前状态为${body.chargerStatus}`)
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

        case Status.end:
            chargerID = input
            let endReq: endChargeReq = {type: "endCharge", chargerID: chargerID}
            requestFunc(endReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as endChargeRes
                    switch (body.type) {
                        case "OK":
                            console.log(`关闭${body.chargerID}号充电桩成功，当前状态为${body.chargerStatus}`)
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

        case Status.waitCar:
            chargerID = input
            let carReq: waitCarReq = {type: "WaitCarMessage", chargerID: chargerID}
            requestFunc(carReq, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    body = body as waitCarRes
                    console.log(`充电桩ID: ${body.chargerID}\n` +
                        `用户ID: ${body.userID}\n` +
                        `车辆电池总容量: ${body.carCapacity}度\n` +
                        `请求充电量: ${body.capacity}度\n` +
                        `排队时长: ${body.queueTime}`)
                }
            })
            rl.prompt()
            status = Status.init
            break
    }

})

// 设置结束事件
rl.on("close", () => {
    console.log("Bye.Administrator~")
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
