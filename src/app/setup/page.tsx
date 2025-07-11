"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "@app/hooks/useToast";
import { useCallback, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@app/components/ui/card";
import CopyTextBox from "@app/components/CopyTextBox";
import { formatAxiosError } from "@app/lib/api";;
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Alert, AlertDescription } from "@app/components/ui/alert";
import CreateSiteForm from "../[orgId]/settings/sites/CreateSiteForm";
import { useTranslations } from "next-intl";

type Step = "org" | "site" | "resources";

export default function StepperForm() {
    const [currentStep, setCurrentStep] = useState<Step>("org");
    const [orgIdTaken, setOrgIdTaken] = useState(false);
    const t = useTranslations();

    const [loading, setLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orgCreated, setOrgCreated] = useState(false);

    const orgSchema = z.object({
        orgName: z.string().min(1, { message: t('orgNameRequired') }),
        orgId: z.string().min(1, { message: t('orgIdRequired') })
    });

    const orgForm = useForm<z.infer<typeof orgSchema>>({
        resolver: zodResolver(orgSchema),
        defaultValues: {
            orgName: "",
            orgId: ""
        }
    });

    const api = createApiClient(useEnvContext());
    const router = useRouter();

    const checkOrgIdAvailability = useCallback(async (value: string) => {
        if (loading || orgCreated) {
            return;
        }
        try {
            const res = await api.get(`/org/checkId`, {
                params: {
                    orgId: value
                }
            });
            setOrgIdTaken(res.status !== 404);
        } catch (error) {
            setOrgIdTaken(false);
        }
    }, [loading, orgCreated, api]);

    const debouncedCheckOrgIdAvailability = useCallback(
        debounce(checkOrgIdAvailability, 300),
        [checkOrgIdAvailability]
    );

    const generateId = (name: string) => {
        // Replace any character that is not a letter, number, space, or hyphen with a hyphen
        // Also collapse multiple hyphens and trim
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "-")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    async function orgSubmit(values: z.infer<typeof orgSchema>) {
        if (orgIdTaken) {
            return;
        }

        setLoading(true);

        try {
            const res = await api.put(`/org`, {
                orgId: values.orgId,
                name: values.orgName
            });

            if (res && res.status === 201) {
                setOrgCreated(true);
                router.push(`/${values.orgId}/settings/sites/create`);
            }
        } catch (e) {
            console.error(e);
            setError(
                formatAxiosError(e, t('orgErrorCreate'))
            );
        }

        setLoading(false);
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t('setupNewOrg')}</CardTitle>
                    <CardDescription>
                        {t('setupCreate')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <section className="space-y-6">
                        <div className="flex justify-between mb-2">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "org"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    1
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "org"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {t('setupCreateOrg')}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "site"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    2
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "site"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {t('siteCreate')}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "resources"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    3
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "resources"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {t('setupCreateResources')}
                                </span>
                            </div>
                        </div>

                        <Separator />

                        {currentStep === "org" && (
                            <Form {...orgForm}>
                                <form
                                    onSubmit={orgForm.handleSubmit(orgSubmit)}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={orgForm.control}
                                        name="orgName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('setupOrgName')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                        onChange={(e) => {
                                                            // Prevent "/" in orgName input
                                                            const sanitizedValue = e.target.value.replace(/\//g, "-");
                                                            const orgId = generateId(sanitizedValue);
                                                            orgForm.setValue(
                                                                "orgId",
                                                                orgId
                                                            );
                                                            orgForm.setValue(
                                                                "orgName",
                                                                sanitizedValue
                                                            );
                                                            debouncedCheckOrgIdAvailability(
                                                                orgId
                                                            );
                                                        }}
                                                        value={field.value.replace(/\//g, "-")}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                <FormDescription>
                                                    {t('orgDisplayName')}
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={orgForm.control}
                                        name="orgId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('orgId')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                <FormDescription>
                                                    {t('setupIdentifierMessage')}
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    {orgIdTaken && !orgCreated ? (
                                        <Alert variant="destructive">
                                            <AlertDescription>
                                                {t('setupErrorIdentifier')}
                                            </AlertDescription>
                                        </Alert>
                                    ) : null}

                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertDescription>
                                                {error}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={loading}
                                            disabled={
                                                error !== null ||
                                                loading ||
                                                orgIdTaken
                                            }
                                        >
                                            {t('setupCreateOrg')}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </section>
                </CardContent>
            </Card>
        </>
    );
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
