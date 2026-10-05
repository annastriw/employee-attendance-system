import { Button, DateField, DateRangePicker, FieldError, Label, RangeCalendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { DATE_RANGE_PRESETS, dateRangePreset, isDateRange, type DateRangeValue } from "../lib/date-range";

export function DateRangeField({ label = "Rentang tanggal", value, onChange, disabled = false, error, now }: {
  label?: string; value: DateRangeValue | null; onChange: (value: DateRangeValue | null) => void;
  disabled?: boolean; error?: string; now?: Date;
}) {
  const range = value && isDateRange(value)
    ? { start: parseDate(value.startDate), end: parseDate(value.endDate) } : null;
  return (
    <I18nProvider locale="id-ID-u-ca-gregory">
      <div className="date-range-field">
        <DateRangePicker value={range} onChange={(next) => onChange(next ? { startDate: next.start.toString(), endDate: next.end.toString() } : null)}
          className="form-field" isDisabled={disabled} isInvalid={!!error} validationBehavior="aria"
          startName="startDate" endName="endDate" shouldForceLeadingZeros>
          <Label>{label}</Label>
          <DateField.Group>
            <DateField.InputContainer>
              <DateField.Input slot="start">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
              <DateRangePicker.RangeSeparator />
              <DateField.Input slot="end">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            </DateField.InputContainer>
            <DateField.Suffix>
              <DateRangePicker.Trigger aria-label="Buka kalender rentang tanggal"><DateRangePicker.TriggerIndicator /></DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          {error && <FieldError>{error}</FieldError>}
          <DateRangePicker.Popover className="app-calendar-popover">
            <RangeCalendar aria-label={label} visibleDuration={{ months: 1 }}>
              <RangeCalendar.Header>
                <RangeCalendar.Heading />
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}</RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            </RangeCalendar>
        <div className="date-range-presets" role="group" aria-label="Pilihan rentang cepat">
          {DATE_RANGE_PRESETS.map((preset) => {
            const dates = dateRangePreset(preset.id, now);
            const active = value?.startDate === dates.startDate && value?.endDate === dates.endDate;
            return <Button key={preset.id} size="sm" variant={active ? "secondary" : "ghost"} aria-pressed={active}
              isDisabled={disabled} onPress={() => onChange(dates)}>{preset.label}</Button>;
          })}
        </div>
          </DateRangePicker.Popover>
        </DateRangePicker>

      </div>
    </I18nProvider>
  );
}
