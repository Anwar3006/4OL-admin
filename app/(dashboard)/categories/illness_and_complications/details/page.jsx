"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";
import { getDiseaseById } from "@/app/services/diseases-service";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import Loading from "@/components/Loading";
import { Icon } from "@iconify/react";

const IllnessAndComplicationDetails = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [disease, setDisease] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getDiseaseById(id)
        .then((data) => {
          setDisease(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching disease:", error);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  if (!disease) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Disease not found</p>
        <Button
          text="Back to Overview"
          onClick={() => router.push("/categories/illness_and_complications/overview")}
          className="mt-4"
        />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Card
        title={disease.condition_name}
        className="overflow-hidden lg:w-[90%] first-letter:capitalize"
        bodyClass="p-6"
        headerslot={
          <Button
            text="Back to Overview"
           
            className="btn-dark btn-sm"
            onClick={() => router.push("/categories/illness_and_complications/overview")}
          />
        }
      >
        <div className="space-y-6">
          {/* Image */}
          {disease.image_url && (
            <div className="flex justify-center">
              <Image
                src={disease.image_url}
                alt={disease.condition_name}
                width={640}
                height={360}
                unoptimized
                className="max-w-xl shadow-lg"
              />
            </div>
          )}

          {/* About */}
          {disease.about && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                About
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.about} />
              </div>
            </div>
          )}

          {/* Types */}
          {disease.types && disease.types.length > 0 && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Types
              </h3> */}
              <div className={`${disease.types.length > 0 ? 'space-y-4' : 'hidden'}`}>
                {disease.types.map((type, index) => (
                  <div key={index} className=" dark:bg-slate-800">
                    <h4 className="font-semibold text-lg capitalize text-gray-700 dark:text-slate-200 mb-2">
                      {type.type_name}
                    </h4>
                    <div className="text-gray-700 dark:text-slate-300">
                      <HtmlRenderer htmlContent={type.about_type} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Causes */}
          {disease.causes && disease.causes.length > 0 && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Causes
              </h3> */}
              <div className={`${disease.causes.length > 0 ? 'space-y-4' : 'hidden'}`}>
                {disease.causes.map((cause, index) => (
                  <div key={index} className="dark:bg-slate-800">
                    <h4 className="font-semibold text-lg capitalize text-gray-700 dark:text-slate-200 mb-2">
                      {cause.cause_name}
                    </h4>
                    <div className="text-gray-700 dark:text-slate-300">
                      <HtmlRenderer htmlContent={cause.other_possible_causes} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {disease.diagnosis && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Diagnosis
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.diagnosis} />
              </div>
            </div>
          )}

          {/* Treatment */}
          {disease.treating && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Treatment
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.treating} />
              </div>
            </div>
          )}

          {/* Complications */}
          {disease.complications && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Complications
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.complications} />
              </div>
            </div>
          )}

          {/* Prevention */}
          {disease.prevention && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Prevention
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.prevention} />
              </div>
            </div>
          )}

          {/* Specialist to Contact */}
          {disease.specialist_to_contact && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Specialist(s) to Contact
              </h3>
              <p className="text-gray-700 dark:text-slate-300">
                {disease.specialist_to_contact}
              </p>
            </div>
          )}

          {/* Contact your Doctor */}
          {disease.contact_your_doctor && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Contact your Doctor
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.contact_your_doctor} />
              </div>
            </div>
          )}

          {/* More Information */}
          {disease.more_information && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                More Information
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={disease.more_information} />
              </div>
            </div>
          )}

          {/* Attribution */}
          {disease.attribution && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Attribution
              </h3>
              <p className="text-gray-700 dark:text-slate-300">
                {disease.attribution}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default IllnessAndComplicationDetails;
