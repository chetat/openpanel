'use client';

import * as React from 'react';
import type { IChartData } from '@/app/_trpc/client';
import { Pagination, usePagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFormatDateInterval } from '@/hooks/useFormatDateInterval';
import { useMappings } from '@/hooks/useMappings';
import { useNumber } from '@/hooks/useNumerFormatter';
import { useSelector } from '@/redux';
import { getChartColor } from '@/utils/theme';

import { PreviousDiffIndicator } from '../PreviousDiffIndicator';

interface ReportTableProps {
  data: IChartData;
  visibleSeries: IChartData['series'];
  setVisibleSeries: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ReportTable({
  data,
  visibleSeries,
  setVisibleSeries,
}: ReportTableProps) {
  const pagination = usePagination(50);
  const number = useNumber();
  const interval = useSelector((state) => state.report.interval);
  const formatDate = useFormatDateInterval(interval);
  const getLabel = useMappings();

  function handleChange(name: string, checked: boolean) {
    setVisibleSeries((prev) => {
      if (checked) {
        return [...prev, name];
      } else {
        return prev.filter((item) => item !== name);
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-[200px_1fr] border border-border rounded-md overflow-hidden">
        <Table className="rounded-none border-t-0 border-l-0 border-b-0">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.series
              .slice(pagination.skip, pagination.skip + pagination.take)
              .map((serie, index) => {
                const checked = !!visibleSeries.find(
                  (item) => item.name === serie.name
                );

                return (
                  <TableRow key={serie.name}>
                    <TableCell className="h-10">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          onCheckedChange={(checked) =>
                            handleChange(serie.name, !!checked)
                          }
                          style={
                            checked
                              ? {
                                  background: getChartColor(index),
                                  borderColor: getChartColor(index),
                                }
                              : undefined
                          }
                          checked={checked}
                        />
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
                              {getLabel(serie.name)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getLabel(serie.name)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <div className="overflow-auto">
          <Table className="rounded-none border-none">
            <TableHeader>
              <TableRow>
                <TableHead>Total</TableHead>
                <TableHead>Average</TableHead>
                {data.series[0]?.data.map((serie) => (
                  <TableHead
                    key={serie.date.toString()}
                    className="whitespace-nowrap"
                  >
                    {formatDate(serie.date)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.series
                .slice(pagination.skip, pagination.skip + pagination.take)
                .map((serie) => {
                  return (
                    <TableRow key={serie.name}>
                      <TableCell className="h-10">
                        <div className="flex items-center gap-2 font-medium">
                          {number.format(serie.metrics.sum)}
                          <PreviousDiffIndicator
                            {...serie.metrics.previous.sum}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="h-10">
                        <div className="flex items-center gap-2 font-medium">
                          {number.format(serie.metrics.average)}
                          <PreviousDiffIndicator
                            {...serie.metrics.previous.average}
                          />
                        </div>
                      </TableCell>

                      {serie.data.map((item) => {
                        return (
                          <TableCell
                            className="h-10"
                            key={item.date.toString()}
                          >
                            <div className="flex items-center gap-2">
                              {number.format(item.count)}
                              <PreviousDiffIndicator {...item.previous} />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-4 md:flex-row md:justify-between md:items-center">
        <div className="flex gap-1 flex-wrap">
          <Badge>Total: {number.format(data.metrics.sum)}</Badge>
          <Badge>Average: {number.format(data.metrics.average)}</Badge>
          <Badge>Min: {number.format(data.metrics.min)}</Badge>
          <Badge>Max: {number.format(data.metrics.max)}</Badge>
        </div>
        <Pagination {...pagination} />
      </div>
    </>
  );
}
