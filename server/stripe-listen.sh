#!/bin/bash
stripe listen --forward-to localhost:5000/api/order/stripe/webhook
