"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSymptomById } from "@/app/services/symptoms-service";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import Loading from "@/components/Loading";

const SymptomDetails = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [symptom, setSymptom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getSymptomById(id)
        .then((data) => {
          setSymptom(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching symptom:", error);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  if (!symptom) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Symptom not found</p>
        <Button
          text="Back to Overview"
          onClick={() => router.push("/categories/symptoms/overview")}
          className="mt-4"
        />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Card
        title={symptom.symptom_name}
        className="overflow-hidden lg:w-[90%] first-letter:uppercase"
        bodyClass="p-6"
        headerslot={
          <Button
            text="Back to Overview"
            icon="heroicons-outline:arrow-left"
            className="btn-dark btn-sm"
            onClick={() => router.push("/categories/symptoms/overview")}
          />
        }
      >
        <div className="space-y-6">
          {/* Image */}
          {symptom.image_url && (
            <div className="flex justify-center">
              <img
                src={symptom.image_url}
                alt={symptom.symptom_name}
                className="max-w-xl shadow-lg"
              />
            </div>
          )}

          {/* About */}
          {symptom.about && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                About
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.about} />
              </div>
            </div>
          )}

          {/* Types */}
          {symptom.types && symptom.types.length > 0 && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Types
              </h3> */}
              <div className={`${symptom.types.length > 0 ? 'space-y-4' : 'hidden'}`}>
                {symptom.types.map((type, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
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
          {symptom.causes && symptom.causes.length > 0 && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Causes
              </h3> */}
              <div className={`${symptom.causes.length > 0 ? 'space-y-4' : 'hidden'}`}>
                {symptom.causes.map((cause, index) => (
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
          {symptom.diagnosis && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Diagnosis
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.diagnosis} />
              </div>
            </div>
          )}

          {/* Treatment */}
          {symptom.treating && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Treatment
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.treating} />
              </div>
            </div>
          )}

          {/* Complications */}
          {symptom.complications && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Complications
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.complications} />
              </div>
            </div>
          )}

          {/* Prevention */}
          {symptom.prevention && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Prevention
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.prevention} />
              </div>
            </div>
          )}

          {/* Specialist to Contact */}
          {symptom.specialist_to_contact && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Specialist(s) to Contact
              </h3>
              <p className="text-gray-700 dark:text-slate-300">
                {symptom.specialist_to_contact}
              </p>
            </div>
          )}

          {/* Contact your Doctor */}
          {symptom.contact_your_doctor && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Contact your Doctor
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.contact_your_doctor} />
              </div>
            </div>
          )}

          {/* More Information */}
          {symptom.more_information && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                More Information
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={symptom.more_information} />
              </div>
            </div>
          )}

          {/* Attribution */}
          {symptom.attribution && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Attribution
              </h3>
              <p className="text-gray-700 dark:text-slate-300">
                {symptom.attribution}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SymptomDetails;

