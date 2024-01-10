#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BffServiceStack } from "../lib/bff-service-stack";

const app = new cdk.App();
new BffServiceStack(app, "BffServiceStack");
