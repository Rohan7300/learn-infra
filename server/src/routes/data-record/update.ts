import { Request, Response } from "express";
import { NotFoundError } from "../../errors/not-found-error";
import { currentUser } from "../../middleware/current-user";
import { requireAuth } from "../../middleware/require-auth";
import { validateRequest } from "../../middleware/validate-request";
import { DataRecord } from "../../models/data-record";
import {Datamodel, DatamodelDoc} from "../../models/data-model";
import {BadRequestError} from "../../errors/bad-request-error";
import {logActivity} from "../../helper/log";

import express from 'express';
import mongoose from "mongoose";
import { runWorkflowUtils } from "../../common/runWorkflowOnUpdate";
import { TriggerType } from "../../models/workflow";
const router = express.Router();
let company_id: string | undefined = '';
let user_id: string | undefined = '';

router.put(
  "/api/datarecord/:id",
  currentUser,
  requireAuth,
  validateRequest,
  async (req: Request, res: Response) => {
    const dataRecord = await DataRecord.findById(req.params.id);
    let primaryKey = "";
    let secondaryKey = "";
    let dataModelID = "";
    let dataModelDetail: DatamodelDoc | null = null;
    let uniqueId = "";
    const fields = req.body.fields;
      company_id = req?.currentUser?.companyId;
      user_id = req?.currentUser?.id;

    if (!dataRecord) {
        await logActivity(company_id, user_id, "DataRecord", "DataRecord doesn't exists.");
      throw new NotFoundError();
    }

      if (dataRecord){
          dataModelID = dataRecord.dataModel._id;
          dataModelDetail = await Datamodel.findById(dataModelID);
          if (dataModelDetail) {
              if (dataModelDetail.primaryKeys) {
                  primaryKey = dataModelDetail.primaryKeys;
              }
              else {
                  primaryKey = "";
              }
              if (dataModelDetail.secondaryKeys) {
                  secondaryKey = dataModelDetail.secondaryKeys;
              }
              else {
                  secondaryKey = "";
              }
          }
      }

      if (typeof dataRecord.secondaryKey === undefined || secondaryKey == "") {
          if (typeof dataRecord.primaryKey === undefined || primaryKey == "") {
              uniqueId = "";
          }
          else {
              uniqueId = fields[primaryKey];
          }
      }
      else {
          uniqueId = fields[primaryKey] + fields[secondaryKey];
      }

      let primaryKeyValue = fields[primaryKey];
      let secondaryKeyValue = fields[secondaryKey];

      // let existingRecord;
      // if (uniqueId){
      //     existingRecord = await DataRecord.findOne({company: dataRecord.company, uniqueId: uniqueId});
      //     if (existingRecord && primaryKeyValue !== dataRecord.primaryKey && secondaryKeyValue !== dataRecord.secondaryKey) {
      //         await logActivity(company_id, user_id, "DataRecord", "Record already exist with a combination of " + primaryKey + " " + secondaryKey);
      //         throw new BadRequestError("Record already exist with a combination of " + primaryKey + " " + secondaryKey);
      //     }
      // }
      // if (primaryKey){
      //     existingRecord = await DataRecord.findOne({company: dataRecord.company, primaryKey: primaryKeyValue});
      //     if (existingRecord && primaryKeyValue !== dataRecord.primaryKey) {
      //         await logActivity(company_id, user_id, "DataRecord", "Record already exist with same " + primaryKey);
      //         throw new BadRequestError("Record already exist with same " + primaryKey);
      //     }
      // }
      // if (secondaryKey){
      //     existingRecord = await DataRecord.findOne({company: dataRecord.company, secondaryKey: secondaryKeyValue});
      //     if (existingRecord && secondaryKeyValue !== dataRecord.secondaryKey) {
      //         await logActivity(company_id, user_id, "DataRecord", "Record already exist with same " + secondaryKey);
      //         throw new BadRequestError("Record already exist with same " + secondaryKey);
      //     }
      // }

    if (req.body.objectName !== undefined) {
      dataRecord.objectName = req.body.objectName;
        await logActivity(company_id, user_id, "DataRecord - Update Object Name", dataRecord.objectName.toString());
    }

    if (req.body.fields !== undefined) {
      dataRecord.fields = req.body.fields;
      if (dataModelDetail && dataModelDetail.properties && typeof dataModelDetail.properties === 'object') {
        const properties = dataModelDetail.properties as { [key: string]: { type: string } };
        for (const key in properties) {
          if (properties.hasOwnProperty(key)) {
            if (properties[key].type == 'reference') {
              //@ts-ignore
              dataRecord.fields[key] = new mongoose.Types.ObjectId(dataRecord.fields[key]);
            }
          }
        }
      }
        await logActivity(company_id, user_id, "DataRecord - Update Fields", dataRecord.fields.toString());
    }

    if (req.body.isActive !== undefined) {
      dataRecord.isActive = req.body.isActive;
      await logActivity(company_id, user_id, "DataRecord - Update Active", req.body.isActive.toString());
    }

    dataRecord.primaryKey = primaryKeyValue;
    dataRecord.secondaryKey = secondaryKeyValue;
    dataRecord.uniqueId = uniqueId;

    await dataRecord.save();
    await logActivity(company_id, user_id, "DataRecord - Update", "DataRecord updated successfully.");
    console.log("Run work on update Record===================================")
    await runWorkflowUtils(req.params.id as string , company_id as string, user_id as string,[TriggerType.update,TriggerType.createOrUpdate])
    res.send(dataRecord);
  }
);

export { router as updateDataRecordRouter };
