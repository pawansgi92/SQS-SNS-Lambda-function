/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * 
 * Author : Pawan Nagar <pawan.sgi92@gmail.com>
 * 
 * If you need any help you can send me email also with you problem mention in it. 
 */


let AWS = require('aws-sdk');
let sqs = new AWS.SQS();
let date = require('date-and-time');
const sns = new AWS.SNS();
var mysql = require('mysql');


// I define this env variable in lambda function 


const connection = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DATABASE
});

exports.handler = (event, context, callback) => {

    sqs.receiveMessage({
        QueueUrl:  process.env.QueueUrl,
        AttributeNames: ['All'],
        MaxNumberOfMessages: '1',
        VisibilityTimeout: '30',
        WaitTimeSeconds: '20'
    }).promise()
            .then(data => {
                data.Messages.forEach(message => {
                    let queue_json = JSON.parse(message.Body);
                    console.log("Received message with payload", queue_json);
                    let messageBody = JSON.parse(message.Body);
                    let DateObj = new Date();
                    console.log("json body of comment", JSON.parse(queue_json));
                  
                    let sns = new AWS.SNS({apiVersion: '2012-11-05', region: '{REGION}'});// mention your SNS region
                    let query = 'SELECT user_id from user_master';
                    console.log(query);
                    connection.query(query, function (error, results, fields) {
                        if (error) {
                            connection.destroy();
                            throw error;
                        } else {
                           
                            let UserListToSendPush = results[0].user_id;
                            /*
                             * 
                             * Getting Data of user to send push notification
                             */
                            let pushQuery = 'SELECT device_type,end_point from device_info ';
                            console.log(pushQuery);
                            connection.query(pushQuery, function (pusherror, pushresults, pushfields) {
                                if (pusherror) {
                                    console.log(" error in arn query");
                                    connection.destroy();
                                    throw error;
                                } else {

                                    /*
                                     * 
                                     * Loop for Data in which we get the user and user device info
                                     *  and send them push notification on android and ios with payload you can change the payload but do not change default format
                                     */


                                    pushresults.forEach(function (row) {
                                        let TargetArn = row.endpoint;
                                        if (row.device_type == 'android') {
                                            console.log("andriod user id", row.endpoint);
                                            let TargetArn = row.endpoint;
                                            let MessageObject = {data: {
                                                    campaign_source: "",
                                                    // 'content-available': 1,
                                                    identifier: "push",
                                                    notification_id: 0,
                                                    params: JSON.parse(jsonbody.comment_json),
                                                    target: 75,
                                                    gcm_msg: "",
                                                    badge: 7,
                                                    title: "sample push notification",
                                                    target_url: "",
                                                    campaign_id: 0
                                                }};
                                            let finalMessageObj = {GCM: JSON.stringify(MessageObject)};
                                            var params = {
                                                Message: JSON.stringify(finalMessageObj),
                                                Subject: "push",
                                                MessageStructure: "json",
                                                TargetArn: TargetArn 
                                            };
                                            sns.publish(params, context.done);
                                        } else if (row.device_type == 'ios') {

                                            console.log("IOS device code need to implement");
                                            console.log("ios user id", TargetArn);
                                            let messageObject = {
                                                aps: {
                                                    'content-available': 0
                                                }, data: {
                                                    'action-loc-key': "View",
                                                    title: "sample push notification",
                                                    identifier: "push",
                                                    notification_id: "",
                                                    target: "",
                                                    sound: "default",
                                                    target_url: "",
                                                    params: JSON.parse(jsonbody.comment_json)
                                                }
                                            };
                                            let payload = {
                                              //'action-loc-key': "View",
                                                title: "sample push notification",
                                                identifier: "push",
                                                notification_id: 0,
                                                target: "",
                                                sound: "default",
                                                target_url: "",
                                                params: "you can send any data in it format should be string"
                                            };
//                                            
                                            let params = {
                                                TargetArn: TargetArn,
                                                MessageStructure: 'json', 
                                                Message: JSON.stringify({
                                                    default: `push`,
                                                    APNS_SANDBOX: JSON.stringify({
                                                        aps: {
                                                            alert: `push`,
                                                        },
                                                        payload,
                                                    }),
                                                   APNS: JSON.stringify({
                                                       aps: {
                                                           alert: `IOS Production SPECIFIC MESSAGE`,
                                                       },
                                                       payload,
                                                   }),
                                                })};

                                            sns.publish(params, context.done);
                                        }

                                    });
                                }
                            });


                            callback(error, results);
                        }
                    });

                    /*
                     * Deleting the message from Queue
                     */


                    sqs.deleteMessage({
                        QueueUrl: process.env.QueueUrl,
                        ReceiptHandle: message.ReceiptHandle

                    }).promise()
                            .then(data => {
                                console.log("Successfully deleted message with ReceiptHandle : " + message.ReceiptHandle);
                            })
                            .catch(err => {
                                console.log("Error while deleting the fetched message with ReceiptHandle : " + message.ReceiptHandle);
                            });
                });
            })
            .catch(err => {
                console.log("Error while fetching messages from the sqs queue", err);
            });


    callback(null, 'Lambda execution completed');
};


