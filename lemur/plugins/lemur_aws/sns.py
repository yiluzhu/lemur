"""
.. module: lemur.plugins.lemur_aws.sts
    :platform: Unix
    :copyright: (c) 2020 by Netflix Inc., see AUTHORS for more
    :license: Apache, see LICENSE for more details.
.. moduleauthor:: Jasmine Schladen <jschladen@netflix.com>
"""
import json

import arrow
import boto3
from flask import current_app


def publish(topic_arn, certificates, notification_type, **kwargs):
    sns_client = boto3.client("sns", **kwargs)
    message_ids = {}
    subject = "Lemur: {0} Notification".format(notification_type.capitalize())
    for certificate in certificates:
        message_ids[certificate["name"]] = publish_single(sns_client, topic_arn, certificate, notification_type, subject)

    return message_ids


def publish_single(sns_client, topic_arn, certificate, notification_type, subject):
    response = sns_client.publish(
        TopicArn=topic_arn,
        Message=format_message(certificate, notification_type),
        Subject=subject,
    )

    response_code = response["ResponseMetadata"]["HTTPStatusCode"]
    if response_code != 200:
        raise Exception(f"Failed to publish {notification_type} notification to SNS topic {topic_arn}. "
                        f"SNS response: {response_code} {response}")

    current_app.logger.info(f"AWS SNS message published to topic [{topic_arn}] with message ID {response['MessageId']}")
    current_app.logger.debug(f"AWS SNS message published to topic [{topic_arn}]: [{response}]")

    return response["MessageId"]


def create_certificate_url(name):
    return "https://{hostname}/#/certificates/{name}".format(
        hostname=current_app.config.get("LEMUR_HOSTNAME"), name=name
    )


def format_message(certificate, notification_type):
    json_message = {
        "notification_type": notification_type,
        "certificate_name": certificate["name"],
        "issuer": certificate["issuer"],
        "id": certificate["id"],
        "expires": arrow.get(certificate["validityEnd"]).format("YYYY-MM-DDTHH:mm:ss"),  # 2047-12-31T22:00:00
        "endpoints_detected": len(certificate["endpoints"]),
        "owner": certificate["owner"],
        "details": create_certificate_url(certificate["name"])
    }
    return json.dumps(json_message)
