import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Globe } from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
// UI Components
import { Skeleton } from "@/components/ui/skeleton";

interface NewsItem {
    uuid: string;
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
    type: string;
    thumbnail?: {
        resolutions: { url: string; width: number; height: number }[];
    };
    related_symbol?: string;
}

const fetchGlobalNews = async (): Promise<NewsItem[]> => {
    const res = await api.get<NewsItem[]>("/news/global");
    return res.data;
};

export default function NewsPage() {
    const { data: news, isLoading, isError } = useQuery({
        queryKey: ["global-news"],
        queryFn: fetchGlobalNews,
        refetchInterval: 60000 * 5, // Refresh every 5 mins
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-8 w-8 text-primary" />
                    Global Market News
                </h1>
                <p className="text-muted-foreground">
                    Latest updates from major financial markets and government decisions.
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="flex flex-col h-full overflow-hidden">
                            <Skeleton className="h-48 w-full" />
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent className="flex-1">
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-md bg-destructive/15 p-6 text-destructive">
                    Failed to load news. Please try again later.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {news?.map((item) => (
                        <Card key={item.uuid} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
                            {item.thumbnail?.resolutions?.[0]?.url && (
                                <div className="h-48 w-full overflow-hidden border-b">
                                    <img
                                        src={item.thumbnail.resolutions[0].url}
                                        alt={item.title}
                                        className="h-full w-full object-cover transition-transform hover:scale-105 duration-500"
                                    />
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {item.related_symbol || "MARKET"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {item.providerPublishTime && item.providerPublishTime > 0
                                            ? formatDistanceToNow(new Date(item.providerPublishTime * 1000), { addSuffix: true })
                                            : "Recently"
                                        }
                                    </span>
                                </div>
                                <CardTitle className="text-lg leading-tight line-clamp-3 hover:text-primary transition-colors">
                                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                                        {item.title || "No Title Available"}
                                    </a>
                                </CardTitle>
                                <CardDescription className="font-medium text-xs mt-1">
                                    {item.publisher || "Unknown Source"}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="mt-auto pt-0">
                                <Button variant="ghost" size="sm" className="w-full justify-between group" asChild>
                                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                                        Read Article
                                        <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
