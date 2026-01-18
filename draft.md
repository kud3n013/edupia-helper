Create page "Quản lý buổi học", on Supabase, create public.records. In that page, teachers can look back on the record of lessons they have taught and given feedback to, user-specific. The display is a table, almost like a sheet, that show the following columns:
- "Mã lớp học" [class_id]
- "Lớp" [grade]
- "Trình độ" [level]
These three are copied from the lesson feedback as soon as the feedback is generated (user click on "Tạo feedback" on lesson page). Create the same variables on public.records. 

Then create more varibles in public.records for the following columns
- "Thu nhập" [rate], the value is determined by two things, the [status] and the [pay_rate]. First, if [status] is "Hoàn thành", then value = [pay_rate]*1; "HS vắng mặt" value = [pay_rate]*0.3; "GS vắng mặt" value = [pay_rate]*-2; "Hủy" or "Chưa mở lớp" value = [pay_rate]*0 .
- "Trạng thái lớp" [status], by default if the lesson is recorded by the lesson page, it should be "Hoàn thành", otherwise user can select one of these "Hủy", "HS vắng mặt", "GS vắng mặt", "Chưa mở lớp". 
- "Loại lớp" [class_type], "CN" or "BU", selectable. I'll work on this later in new features. By default, it should be "BU".
- "Trạng thái nhận xét" [feedback_status], "Đã nhận xét" or "Chưa nhận xét", selectable. By default it should be "Đã nhận xét" if records are saved from lesson page, otherwise it should be "Chưa nhận xét" if manually added to. 
- "Ngày giảng dạy" [date], the date the lesson is recorded by default. Can be changed manually using date picker. 
- "Giờ bắt đầu" [time_start], from future features, to be developed. Selectable from 19:00 to 21:00.

On each column, there is a sort button. By default, the table is sorted by [date] in descending order. 

On top of the page, there is a search bar. It can search for [class_id], [grade], [level], [status], [feedback_status], [date], [time_start]. fuzzy search is used. 

Right side of the search bar is a View bar for month, week or year view. Month is default. 

Next to it is "Bậc lương" [pay_rate] bar, where user can select from S+ to D. A+ have 80.000 VND for 1 on 1 class, 95.000 VND for 1 on 4 class, 110.000 VND for 1 on 6 class. B+ have 60.000 VND for 1 on 1 class, 75.000 VND for 1 on 4 class, 90.000 VND for 1 on 6 class. C+ have 50.000 VND for 1 on 1 class, 65.000 VND for 1 on 4 class. D have 40.000 VND for 1 on 1 class, 55.000 VND for 1 on 4 class. The pay_rate is saved to the database. 

Of course, on Supabase, there should be uuid of each user for each record, so the client can know which record will be displayed to which user.


## 
In lesson page, when input the class_id. It should check if the public.records already have that class_id lesson. If yes, warns the users that it has already been given feedback to. 

Recreate every columns from lesson page (public.lessons) that are responsible for storing the input information on that page into table on public.records. When click on "Tạo feedback" those information will be saved to public.records as well. 

Upon warning for duplicate feedback, the lesson page also ask user if they want to load the old feedback (if exists only, before this implementation there is no data available). Then utilize the columns that I just asked you to add to load back to old feedback ì user choose yes "Đồng ý", otherwise "Thôi khỏi, cảm ơn", let users edit as is. 

The lesson feedback with the same class_id will overide the old one in public.records when click "Tạo feedback". At that step, before performing the overide and generate the feedback. The web page has to warn the user one more time about the possible overide. 

In record page, right next to (the left) of each class_id is an edit button to access and edit the old feedback information.


## Pre-filled names

In lesson page, when input the class_id. It should check if the public.classes for the fixed_class_id that fit the class_id in the sequence `[fixed_class_id]-[number]` exists. If yes, it will automatically pre-fill the names of the students in the class into the lesson page. 