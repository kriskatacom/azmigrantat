<?php if ($error = \App\Core\Session::getFlash('error')): ?>
    <div class="alert alert-danger" style="background: #fee2e2; color: #b91c1c; padding: 15px; border-left: 5px solid #ef4444; margin: 20px 0;">
        <strong>Грешка:</strong> <?= htmlspecialchars($error) ?>
    </div>
<?php endif; ?>

<?php if ($success = \App\Core\Session::getFlash('success')): ?>
    <div class="alert alert-success" style="background: #dcfce7; color: #166534; padding: 15px; border-left: 5px solid #22c55e; margin: 20px 0;">
        <?= htmlspecialchars($success) ?>
    </div>
<?php endif; ?>
