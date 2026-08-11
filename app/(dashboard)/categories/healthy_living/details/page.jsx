"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { getHealthyLivingEntryById } from "@/app/services/healthy-living-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import Loading from "@/components/Loading";

const HealthyLivingDetails = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getHealthyLivingEntryById(id)
        .then((data) => {
          setArticle(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching article:", error);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  if (!article) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Article not found</p>
        <Button
          onClick={() => router.push("/categories/healthy_living/overview")}
          className="mt-4"
        >
          Back to Overview
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Card className="overflow-hidden lg:w-[90%]">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>{article.topic_name || article.headline}</CardTitle>
          <Button
            className="btn-sm px-3 h-8"
            variant="default"
            onClick={() => router.push("/categories/healthy_living/overview")}
          >
            <Icon icon="heroicons-outline:arrow-left" className="text-lg mr-2" />
            Back to Overview
          </Button>
        </CardHeader>
        <CardContent className="p-6">
        <div className="space-y-6">
          {/* Image */}
          {article.image_url && (
            <div className="flex justify-center">
              <Image
                src={article.image_url}
                alt={article.topic_name || article.headline}
                width={640}
                height={360}
                unoptimized
                className="max-w-xl shadow-lg"
              />
            </div>
          )}

          {/* About */}
          {article.about && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                About
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={article.about} />
              </div>
            </div>
          )}

          {/* TODO: Update View to include newly added Types.Type_Name and Types.About_Type */}

          {/* Category */}
          {article.category && (
            <div>
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Category
              </h3> */}
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={article.category} />
              </div>
            </div>
          )}

          {/* Contact your Doctor */}
          {article.contact_your_doctor && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Contact your Doctor
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={article.contact_your_doctor} />
              </div>
            </div>
          )}

          {/* More Information */}
          {article.more_information && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                More Information
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={article.more_information} />
              </div>
            </div>
          )}

          {/* Attribution */}
          {article.attribution && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Attribution
              </h3>
              <div className="text-gray-700 dark:text-slate-300">
                <HtmlRenderer htmlContent={article.attribution} />
              </div>
            </div>
          )}
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthyLivingDetails;
