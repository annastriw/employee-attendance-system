import { Calendar, DateField, DatePicker, Description, FieldError, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { isDateRange } from "../lib/date-range";

/** A single calendar date for forms and daily monitoring, never a timezone instant. */
export function CalendarField({ label, value, onChange, disabled = false, required = false, min, error, hint }: {
  label: string; value: string; onChange: (value: string) => void;
  disabled?: boolean; required?: boolean; min?: string; error?: string; hint?: string;
}) {
  const valid = (date: string) => isDateRange({ startDate: date, endDate: date });
  return <I18nProvider locale="id-ID-u-ca-gregory">
    <DatePicker className="form-field" value={valid(value) ? parseDate(value) : null}
      onChange={(next) => onChange(next?.toString() ?? "")} isDisabled={disabled}
      isRequired={required} minValue={min && valid(min) ? parseDate(min) : undefined}
      isInvalid={!!error} validationBehavior="aria" shouldForceLeadingZeros>
      <Label>{label}</Label>
      <DateField.Group>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix><DatePicker.Trigger aria-label={`Buka kalender ${label.toLowerCase()}`}><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
      </DateField.Group>
      {hint && <Description>{hint}</Description>}
      {error && <FieldError>{error}</FieldError>}
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header><Calendar.YearPickerTrigger><Calendar.YearPickerTriggerHeading /><Calendar.YearPickerTriggerIndicator /></Calendar.YearPickerTrigger><Calendar.NavButton slot="previous" /><Calendar.NavButton slot="next" /></Calendar.Header>
          <Calendar.Grid><Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader><Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody></Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  </I18nProvider>;
}
